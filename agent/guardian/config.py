"""Arquivo de configuração local do agente (data/config.json).

O Webhook do Discord e o token de acesso ficam SOMENTE neste arquivo, fora do
código-fonte. O arquivo é criado automaticamente na primeira execução.
"""
from __future__ import annotations

import copy
import json
import os
import secrets
import threading
from pathlib import Path
from typing import Any

from .bosses import default_boss_config

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("GRW_DATA_DIR", BASE_DIR / "data"))

BUCKETS = ["gray", "red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"]


def defaults() -> dict:
    return {
        "server": {"host": "127.0.0.1", "port": 8765, "token": ""},
        "panel_url": "",
        "discord": {"webhook_url": "", "enabled": True},
        "window": {"title_contains": "Lineage II", "process_name": "L2.exe", "bring_to_front": False},
        "monitor": {
            "interval_seconds": 30,
            "click_delay_ms": 350,
            "after_click_wait_ms": 900,
            "click_mode": "mouse",  # mouse | background
            "restore_mouse": True,
            "confirm_reads": 2,
            "confirm_delay_ms": 1200,
            "sensitivity": 5,
            "min_valid_rows_pct": 70,
            "row_match_threshold": 0.65,
            "auto_start": False,
        },
        "calibration": {
            "raid_button": None,  # {"x": int, "y": int} relativo à área cliente da janela
            "list_region": None,  # {"x","y","w","h"} relativo à área cliente
            "rows": 20,
            "client_size": None,  # [w, h] no momento da calibração
        },
        "state_labels": {"gray": "Standby", "red": "In Battle"},
        "bosses": default_boss_config(),
    }


def _merge(base: dict, override: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge(out[k], v)
        else:
            out[k] = v
    return out


def _clamp(v: Any, lo: float, hi: float, cast=float):
    try:
        x = cast(v)
    except (TypeError, ValueError):
        raise ValueError(f"valor inválido: {v!r}")
    return max(lo, min(hi, x))


class ConfigStore:
    def __init__(self, data_dir: Path = DATA_DIR):
        self.data_dir = Path(data_dir)
        self.path = self.data_dir / "config.json"
        self.lock = threading.RLock()
        self.data_dir.mkdir(parents=True, exist_ok=True)
        loaded = {}
        if self.path.exists():
            try:
                loaded = json.loads(self.path.read_text(encoding="utf-8"))
            except Exception:
                backup = self.path.with_suffix(".corrompido.json")
                self.path.replace(backup)
                loaded = {}
        self.data = _merge(defaults(), loaded)
        if not self.data["server"].get("token"):
            self.data["server"]["token"] = secrets.token_urlsafe(24)
        self._fix_bosses()
        self.save()

    def _fix_bosses(self) -> None:
        known = {b["id"]: b for b in self.data.get("bosses") or [] if isinstance(b, dict) and "id" in b}
        fixed = []
        for b in default_boss_config():
            cur = known.get(b["id"], {})
            fixed.append({**b, "row": int(cur.get("row", b["row"])), "enabled": bool(cur.get("enabled", True))})
        self.data["bosses"] = fixed

    def save(self) -> None:
        with self.lock:
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps(self.data, indent=2, ensure_ascii=False), encoding="utf-8")
            os.replace(tmp, self.path)

    def get(self) -> dict:
        with self.lock:
            return copy.deepcopy(self.data)

    @property
    def token(self) -> str:
        return self.data["server"]["token"]

    def public_view(self) -> dict:
        """Configuração sem segredos (para o painel)."""
        cfg = self.get()
        url = cfg["discord"].get("webhook_url") or ""
        cfg["discord"] = {
            "enabled": cfg["discord"].get("enabled", True),
            "webhook_set": bool(url),
            "webhook_masked": (url[:40] + "…" + url[-4:]) if len(url) > 48 else ("•" * 8 if url else ""),
        }
        cfg["server"] = {"host": cfg["server"]["host"], "port": cfg["server"]["port"]}
        return cfg

    def update(self, patch: dict) -> dict:
        """Aplica alterações vindas do painel, validando cada campo."""
        with self.lock:
            d = copy.deepcopy(self.data)
            if "discord" in patch:
                p = patch["discord"] or {}
                if "webhook_url" in p:
                    url = (p["webhook_url"] or "").strip()
                    if url and not (url.startswith("https://discord.com/api/webhooks/")
                                    or url.startswith("https://discordapp.com/api/webhooks/")
                                    or url.startswith("https://ptb.discord.com/api/webhooks/")
                                    or url.startswith("https://canary.discord.com/api/webhooks/")):
                        raise ValueError("URL do Webhook inválida. Ela deve começar com https://discord.com/api/webhooks/")
                    d["discord"]["webhook_url"] = url
                if "enabled" in p:
                    d["discord"]["enabled"] = bool(p["enabled"])
            if "window" in patch:
                p = patch["window"] or {}
                if "title_contains" in p:
                    t = str(p["title_contains"] or "").strip()
                    if not t:
                        raise ValueError("Informe parte do título da janela do jogo.")
                    d["window"]["title_contains"] = t[:120]
                if "process_name" in p:
                    d["window"]["process_name"] = str(p["process_name"] or "").strip()[:80]
                if "bring_to_front" in p:
                    d["window"]["bring_to_front"] = bool(p["bring_to_front"])
            if "monitor" in patch:
                p = patch["monitor"] or {}
                m = d["monitor"]
                if "interval_seconds" in p:
                    m["interval_seconds"] = _clamp(p["interval_seconds"], 5, 3600, int)
                if "click_delay_ms" in p:
                    m["click_delay_ms"] = _clamp(p["click_delay_ms"], 50, 5000, int)
                if "after_click_wait_ms" in p:
                    m["after_click_wait_ms"] = _clamp(p["after_click_wait_ms"], 100, 10000, int)
                if "click_mode" in p:
                    if p["click_mode"] not in ("mouse", "background"):
                        raise ValueError("Modo de clique inválido.")
                    m["click_mode"] = p["click_mode"]
                if "restore_mouse" in p:
                    m["restore_mouse"] = bool(p["restore_mouse"])
                if "confirm_reads" in p:
                    m["confirm_reads"] = _clamp(p["confirm_reads"], 1, 5, int)
                if "confirm_delay_ms" in p:
                    m["confirm_delay_ms"] = _clamp(p["confirm_delay_ms"], 200, 10000, int)
                if "sensitivity" in p:
                    m["sensitivity"] = _clamp(p["sensitivity"], 1, 10, int)
                if "min_valid_rows_pct" in p:
                    m["min_valid_rows_pct"] = _clamp(p["min_valid_rows_pct"], 10, 100, int)
                if "row_match_threshold" in p:
                    m["row_match_threshold"] = _clamp(p["row_match_threshold"], 0.2, 0.95, float)
                if "auto_start" in p:
                    m["auto_start"] = bool(p["auto_start"])
            if "state_labels" in patch:
                labels = {}
                for k, v in (patch["state_labels"] or {}).items():
                    if k in BUCKETS and str(v or "").strip():
                        labels[k] = str(v).strip()[:40]
                d["state_labels"] = labels
            if "bosses" in patch:
                rows = d["calibration"].get("rows") or 20
                by_id = {b.get("id"): b for b in patch["bosses"] or [] if isinstance(b, dict)}
                for b in d["bosses"]:
                    p = by_id.get(b["id"])
                    if not p:
                        continue
                    if "row" in p:
                        b["row"] = _clamp(p["row"], 1, max(1, rows), int)
                    if "enabled" in p:
                        b["enabled"] = bool(p["enabled"])
            if "panel_url" in patch:
                d["panel_url"] = str(patch["panel_url"] or "").strip()[:300]
            self.data = d
            self.save()
            return self.public_view()

    def set_calibration(self, raid_button: dict | None, list_region: dict | None, rows: int, client_size) -> None:
        with self.lock:
            c = self.data["calibration"]
            if raid_button is not None:
                c["raid_button"] = {"x": int(raid_button["x"]), "y": int(raid_button["y"])}
            if list_region is not None:
                r = {k: int(list_region[k]) for k in ("x", "y", "w", "h")}
                if r["w"] < 20 or r["h"] < 20:
                    raise ValueError("A área da lista é pequena demais.")
                c["list_region"] = r
            c["rows"] = int(_clamp(rows, 1, 40, int))
            c["client_size"] = [int(client_size[0]), int(client_size[1])] if client_size else None
            for b in self.data["bosses"]:
                b["row"] = min(b["row"], c["rows"])
            self.save()
