"""Controle de estado dos bosses entre ciclos.

Regras:
  * A primeira leitura válida de um boss vira a linha de base (sem notificação).
  * Leituras inválidas (lista não visível, falha de captura) NUNCA geram mudança
    e não alteram o estado registrado.
  * Uma mudança só é confirmada após N leituras consecutivas consistentes.
  * Depois de confirmada, a nova cor vira o estado estável: o boss pode ficar
    nela por horas sem gerar novas notificações.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from .detector import BUCKET_NAMES_PT, RowReading, is_relevant_change


def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def state_label(bucket: Optional[str], labels: dict) -> str:
    if not bucket:
        return "Desconhecido"
    custom = (labels or {}).get(bucket)
    if custom:
        return str(custom)
    name = BUCKET_NAMES_PT.get(bucket, bucket)
    if bucket == "gray":
        return name
    return f"Outra cor ({name})"


@dataclass
class StableState:
    lab: tuple[float, float, float]
    bucket: str
    hex: str
    since: str

    def to_dict(self) -> dict:
        return {"lab": list(self.lab), "bucket": self.bucket, "hex": self.hex, "since": self.since}

    @staticmethod
    def from_dict(d: dict) -> "StableState":
        return StableState(tuple(d["lab"]), d["bucket"], d["hex"], d.get("since") or now_iso())


@dataclass
class Candidate:
    lab: tuple[float, float, float]
    bucket: str
    hex: str
    count: int = 1


@dataclass
class Change:
    boss_id: str
    previous: StableState
    current: StableState


@dataclass
class BossTracker:
    sensitivity: float = 5.0
    confirm_reads: int = 2
    stable: dict[str, StableState] = field(default_factory=dict)
    candidates: dict[str, Candidate] = field(default_factory=dict)
    last_reading: dict[str, RowReading] = field(default_factory=dict)
    last_seen: dict[str, str] = field(default_factory=dict)

    def observe(self, readings: dict[str, RowReading]) -> list[Change]:
        changes: list[Change] = []
        ts = now_iso()
        for boss_id, r in readings.items():
            self.last_reading[boss_id] = r
            if not r.valid or r.lab is None or r.bucket is None:
                # Falha de leitura: nada muda.
                continue
            self.last_seen[boss_id] = ts
            stable = self.stable.get(boss_id)
            if stable is None:
                self.stable[boss_id] = StableState(r.lab, r.bucket, r.hex or "", ts)
                continue
            if not is_relevant_change(stable.lab, stable.bucket, r.lab, r.bucket, self.sensitivity):
                self.candidates.pop(boss_id, None)
                continue
            cand = self.candidates.get(boss_id)
            if cand and not is_relevant_change(cand.lab, cand.bucket, r.lab, r.bucket, self.sensitivity):
                cand.count += 1
            else:
                cand = Candidate(r.lab, r.bucket, r.hex or "")
                self.candidates[boss_id] = cand
            if cand.count >= max(1, int(self.confirm_reads)):
                new_state = StableState(cand.lab, cand.bucket, cand.hex, ts)
                changes.append(Change(boss_id, stable, new_state))
                self.stable[boss_id] = new_state
                self.candidates.pop(boss_id, None)
        return changes

    def has_pending(self) -> bool:
        return bool(self.candidates)

    def reset(self, boss_id: Optional[str] = None) -> None:
        if boss_id is None:
            self.stable.clear()
            self.candidates.clear()
            self.last_reading.clear()
        else:
            self.stable.pop(boss_id, None)
            self.candidates.pop(boss_id, None)
            self.last_reading.pop(boss_id, None)

    def export(self) -> dict:
        return {k: v.to_dict() for k, v in self.stable.items()}

    def load(self, data: dict) -> None:
        self.stable = {}
        for k, v in (data or {}).items():
            try:
                self.stable[k] = StableState.from_dict(v)
            except Exception:  # dados corrompidos: ignora o boss
                continue
