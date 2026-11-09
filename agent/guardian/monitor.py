"""Ciclo de monitoramento: janela -> 2 cliques no RAID -> captura -> análise -> Discord."""
from __future__ import annotations

import json
import logging
import os
import threading
import time
import uuid
from collections import deque
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from pathlib import Path
from typing import Callable, Optional

import numpy as np

from . import VERSION
from . import window as win32
from .capture import CaptureError, crop, grab, to_data_url
from .clicker import ClickError, click_raid_twice
from .config import ConfigStore
from .detector import BUCKET_NAMES_PT, RowReading, analyze_list, is_blank_capture, row_masks, split_rows
from .discord_notify import DiscordNotifier, format_change_message
from .tracker import BossTracker, Change, now_iso, state_label

log = logging.getLogger("guardian")


class CycleError(Exception):
    """Problema que impede um ciclo; nunca é tratado como mudança de estado."""


class ListNotVisible(CycleError):
    def __init__(self, msg: str, readings: list[RowReading]):
        super().__init__(msg)
        self.readings = readings


class RingHandler(logging.Handler):
    def __init__(self, sink: Callable[[dict], None]):
        super().__init__(level=logging.INFO)
        self.sink = sink

    def emit(self, record: logging.LogRecord) -> None:
        try:
            self.sink({
                "at": datetime.fromtimestamp(record.created).astimezone().isoformat(timespec="seconds"),
                "level": record.levelname.lower(),
                "message": record.getMessage(),
            })
        except Exception:
            pass


# --------------------------------------------------------------------------- OCR auxiliar (opcional)

def _ocr_available() -> bool:
    try:
        import pytesseract  # noqa: F401
    except ImportError:
        return False
    default = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(default):
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = default
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def _ocr_row(img: np.ndarray) -> Optional[str]:
    try:
        import cv2
        import pytesseract
        v = img.max(axis=2)
        v = cv2.resize(v, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
        _, bw = cv2.threshold(v, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        return pytesseract.image_to_string(bw, config="--psm 7").strip()
    except Exception:
        return None


def _name_similarity(ocr: str, expected: str) -> float:
    a = "".join(ch for ch in ocr.lower() if ch.isalnum())
    b = "".join(ch for ch in expected.lower() if ch.isalnum())
    if not a or not b:
        return 0.0
    if b in a:
        return 1.0
    return SequenceMatcher(None, a, b).ratio()


# --------------------------------------------------------------------------- monitor

class Monitor:
    def __init__(self, config: ConfigStore, publish: Callable[[dict], None]):
        self.cfg = config
        self.publish = publish
        self.data_dir: Path = config.data_dir
        self.state_path = self.data_dir / "state.json"
        self.events_path = self.data_dir / "events.json"
        self.ref_path = self.data_dir / "reference.npz"

        self.lock = threading.RLock()
        self.device_lock = threading.Lock()
        self.started_at = now_iso()
        self.active = False
        self.status_text = "Parado"
        self.last_update: Optional[str] = None
        self.last_attempt: Optional[str] = None
        self.next_update_at: Optional[str] = None
        self.last_error: Optional[str] = None
        self.last_error_at: Optional[str] = None
        self.cycle_count = 0
        self.changes_count = 0
        self.list_ok: Optional[bool] = None
        self.valid_rows = 0
        self.window_info: Optional[dict] = None
        self.last_change: dict[str, str] = {}
        self.events: list[dict] = []
        self.logs: deque = deque(maxlen=200)
        self.references: Optional[list[np.ndarray]] = None
        self.ocr_available = _ocr_available()

        m = config.get()["monitor"]
        self.tracker = BossTracker(sensitivity=m["sensitivity"], confirm_reads=m["confirm_reads"])
        self._load()

        handler = RingHandler(self._on_log)
        logging.getLogger("guardian").addHandler(handler)

        self.discord = DiscordNotifier(self._webhook_url, self._on_discord_result)
        if not self._webhook_url():
            self.discord.status = "not_configured"

        self._wake = threading.Event()
        self._force = False
        self._thread = threading.Thread(target=self._run, name="monitor", daemon=True)
        self._thread.start()
        if m.get("auto_start"):
            self.start()

    # ------------------------------------------------------------------ persistência
    def _load(self) -> None:
        try:
            if self.state_path.exists():
                s = json.loads(self.state_path.read_text(encoding="utf-8"))
                self.tracker.load(s.get("stable") or {})
                self.last_change = s.get("last_change") or {}
                self.changes_count = int(s.get("changes_count") or 0)
        except Exception as exc:
            log.error("Não foi possível ler o estado salvo: %s", exc)
        try:
            if self.events_path.exists():
                self.events = json.loads(self.events_path.read_text(encoding="utf-8"))[:2000]
        except Exception as exc:
            log.error("Não foi possível ler o histórico: %s", exc)
        self._load_references()

    def _load_references(self) -> None:
        self.references = None
        if not self.ref_path.exists():
            return
        cal = self.cfg.get()["calibration"]
        try:
            data = np.load(self.ref_path)
            rows = int(data["rows"])
            size = tuple(int(x) for x in data["size"])
            region = cal.get("list_region") or {}
            if rows != int(cal.get("rows") or 0) or size != (int(region.get("w", -1)), int(region.get("h", -1))):
                log.warning("Referência da lista não corresponde à calibração atual; capture novamente.")
                return
            self.references = [data[f"row_{i}"] for i in range(rows)]
        except Exception as exc:
            log.error("Referência da lista inválida: %s", exc)

    def _write_json(self, path: Path, obj) -> None:
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
        os.replace(tmp, path)

    def _save_state(self) -> None:
        with self.lock:
            self._write_json(self.state_path, {
                "stable": self.tracker.export(),
                "last_change": self.last_change,
                "changes_count": self.changes_count,
            })

    def _save_events(self) -> None:
        with self.lock:
            self._write_json(self.events_path, self.events[:2000])

    # ------------------------------------------------------------------ notificações internas
    def _on_log(self, entry: dict) -> None:
        self.logs.append(entry)
        self.publish({"type": "log", "entry": entry})

    def _notify(self) -> None:
        try:
            self.publish({"type": "snapshot", "data": self.snapshot()})
        except Exception as exc:  # noqa: BLE001
            print("Falha ao publicar snapshot:", exc)

    def _webhook_url(self) -> str:
        d = self.cfg.get()["discord"]
        return d.get("webhook_url", "") if d.get("enabled", True) else ""

    def _on_discord_result(self, event_id: str, status: str, error: str) -> None:
        with self.lock:
            ev = next((e for e in self.events if e["id"] == event_id), None)
            if ev is None:
                return
            ev["discord_status"] = status
            ev["discord_error"] = error or None
            if status == "sent":
                ev["discord_sent_at"] = now_iso()
            self._save_events()
        if status == "failed":
            log.error("Notificação não enviada ao Discord (%s): %s", ev["boss_name"], error)
        self.publish({"type": "event", "event": ev})
        self._notify()

    def _set_error(self, msg: Optional[str]) -> None:
        with self.lock:
            if msg:
                if msg != self.last_error:
                    log.warning(msg)
                self.last_error = msg
                self.last_error_at = now_iso()
            else:
                self.last_error = None

    # ------------------------------------------------------------------ controle
    def start(self) -> None:
        with self.lock:
            if not self.active:
                self.active = True
                self.status_text = "Iniciando…"
                log.info("Monitoramento iniciado.")
        self._wake.set()
        self._notify()

    def stop(self) -> None:
        with self.lock:
            if self.active:
                log.info("Monitoramento interrompido.")
            self.active = False
            self.status_text = "Parado"
            self.next_update_at = None
        self._wake.set()
        self._notify()

    def run_now(self) -> None:
        self._force = True
        self._wake.set()

    def apply_config(self) -> None:
        m = self.cfg.get()["monitor"]
        self.tracker.sensitivity = m["sensitivity"]
        self.tracker.confirm_reads = m["confirm_reads"]
        if not self._webhook_url():
            self.discord.status = "not_configured"
        elif self.discord.status == "not_configured":
            self.discord.status = "unknown"
        self._wake.set()
        self._notify()

    def _run(self) -> None:
        while True:
            if self.active or self._force:
                self._force = False
                started = time.time()
                try:
                    self.run_cycle()
                except Exception as exc:  # noqa: BLE001
                    log.exception("Erro inesperado no ciclo")
                    self._set_error(f"Erro inesperado: {exc}")
                interval = int(self.cfg.get()["monitor"]["interval_seconds"])
                with self.lock:
                    if self.active:
                        nxt = started + interval
                        self.next_update_at = datetime.fromtimestamp(nxt).astimezone().isoformat(timespec="seconds")
                    else:
                        self.next_update_at = None
                self._notify()
                if self.active:
                    self._wake.wait(timeout=max(0.5, started + interval - time.time()))
                else:
                    self._wake.wait(timeout=1.0)
            else:
                self._wake.wait(timeout=1.0)
            self._wake.clear()

    # ------------------------------------------------------------------ janela / leitura
    def _locate(self, cfg: dict, need_foreground: bool, force_front: bool = False) -> win32.GameWindow:
        if not win32.IS_WINDOWS:
            raise CycleError("O agente precisa estar rodando no Windows, no mesmo PC do jogo.")
        w = cfg["window"]
        win = win32.find_game_window(w["title_contains"], w.get("process_name", ""))
        self.window_info = win.to_dict() if win else None
        if win is None:
            proc = f" / processo '{w.get('process_name')}'" if w.get("process_name") else ""
            raise CycleError(f"Janela do Lineage 2 não encontrada (título '{w['title_contains']}'{proc}). "
                             "Jogo fechado? Nenhum clique executado.")
        if (force_front or (need_foreground and w.get("bring_to_front"))) and not win.foreground:
            win32.bring_to_front(win)
            win = win32.refresh(win) or win
            self.window_info = win.to_dict()
        if win.minimized:
            raise CycleError("A janela do jogo está minimizada. Nenhum clique executado.")
        if need_foreground and not win.foreground:
            raise CycleError("O jogo não está em primeiro plano. Aguardando para não clicar em outro programa.")
        return win

    def _check_calibration(self, cfg: dict, win: win32.GameWindow, need_reference: bool = True) -> None:
        cal = cfg["calibration"]
        if not cal.get("raid_button") or not cal.get("list_region"):
            raise CycleError("Calibração incompleta: marque o botão RAID e a área da lista no painel.")
        size = cal.get("client_size")
        if size and [win.width, win.height] != list(size):
            raise CycleError(f"O tamanho da janela do jogo mudou ({win.width}x{win.height}, calibrado em "
                             f"{size[0]}x{size[1]}). Recalibre para não clicar em coordenadas incorretas.")
        if need_reference and self.references is None:
            raise CycleError("Falta capturar a referência da lista na tela de calibração.")

    def _capture_list(self, cfg: dict, win: win32.GameWindow) -> np.ndarray:
        cur = win32.refresh(win)
        if cur is None:
            raise CycleError("A janela do jogo foi fechada durante a leitura.")
        if cur.minimized:
            raise CycleError("A janela do jogo foi minimizada durante a leitura.")
        r = cfg["calibration"]["list_region"]
        if r["x"] + r["w"] > cur.width or r["y"] + r["h"] > cur.height:
            raise CycleError("A área da lista está fora da janela do jogo. Recalibre.")
        try:
            img = grab(cur.left + r["x"], cur.top + r["y"], r["w"], r["h"])
        except CaptureError as exc:
            raise CycleError(str(exc)) from exc
        if is_blank_capture(img):
            raise CycleError("A captura veio vazia/preta. Use o jogo em modo janela ou tela cheia sem bordas.")
        return img

    def _read_list(self, cfg: dict, win: win32.GameWindow) -> tuple[np.ndarray, list[RowReading]]:
        img = self._capture_list(cfg, win)
        m = cfg["monitor"]
        rows = int(cfg["calibration"]["rows"])
        readings = analyze_list(img, rows, self.references, float(m["row_match_threshold"]))
        valid = sum(1 for r in readings if r.valid)
        self.valid_rows = valid
        if valid * 100 < rows * int(m["min_valid_rows_pct"]):
            raise ListNotVisible(
                f"Lista RAID não identificada na tela ({valid}/{rows} linhas reconhecidas). "
                "Verifique se a janela da lista está aberta na aba Raid.", readings)
        return img, readings

    def _readings_by_boss(self, cfg: dict, readings: list[RowReading]) -> dict[str, RowReading]:
        out = {}
        for b in cfg["bosses"]:
            if not b.get("enabled", True):
                continue
            idx = int(b["row"]) - 1
            if 0 <= idx < len(readings):
                out[b["id"]] = readings[idx]
        return out

    # ------------------------------------------------------------------ ciclo
    def run_cycle(self) -> None:
        cfg = self.cfg.get()
        m = cfg["monitor"]
        with self.device_lock:
            self.last_attempt = now_iso()
            self.status_text = "Atualizando lista…"
            self._notify()
            try:
                win = self._locate(cfg, need_foreground=(m["click_mode"] == "mouse"))
                self._check_calibration(cfg, win)
                try:
                    click_raid_twice(win, cfg["calibration"]["raid_button"], m["click_mode"],
                                     int(m["click_delay_ms"]), bool(m["restore_mouse"]))
                except ClickError as exc:
                    raise CycleError(str(exc)) from exc
                time.sleep(int(m["after_click_wait_ms"]) / 1000)

                # Verifica efetivamente a tela depois dos cliques (com 1 nova tentativa).
                try:
                    _, readings = self._read_list(cfg, win)
                except ListNotVisible:
                    time.sleep(1.0)
                    _, readings = self._read_list(cfg, win)

                changes: list[Change] = self.tracker.observe(self._readings_by_boss(cfg, readings))
                reads = 1
                while self.tracker.has_pending() and reads < int(m["confirm_reads"]) + 1:
                    time.sleep(int(m["confirm_delay_ms"]) / 1000)
                    try:
                        _, readings = self._read_list(cfg, win)
                    except CycleError as exc:
                        log.warning("Confirmação interrompida: %s", exc)
                        break
                    changes += self.tracker.observe(self._readings_by_boss(cfg, readings))
                    reads += 1

                for ch in changes:
                    self._record_change(ch, cfg)
                with self.lock:
                    self.cycle_count += 1
                    self.last_update = now_iso()
                    self.list_ok = True
                    self.status_text = "Monitorando" if self.active else "Leitura avulsa concluída"
                self._set_error(None)
                self._save_state()
            except ListNotVisible as exc:
                for bid, r in self._readings_by_boss(cfg, exc.readings).items():
                    self.tracker.last_reading[bid] = RowReading(False, "lista não identificada")
                with self.lock:
                    self.list_ok = False
                    self.status_text = "Lista não identificada — nova tentativa no próximo ciclo"
                self._set_error(str(exc))
            except CycleError as exc:
                with self.lock:
                    self.status_text = "Aguardando — " + str(exc).split(".")[0]
                self._set_error(str(exc))
        self._notify()

    def _record_change(self, ch: Change, cfg: dict) -> None:
        boss = next((b for b in cfg["bosses"] if b["id"] == ch.boss_id), None)
        if boss is None:
            return
        labels = cfg.get("state_labels") or {}
        ts = datetime.now().astimezone()
        ev = {
            "id": uuid.uuid4().hex[:12],
            "boss_id": boss["id"],
            "boss_name": boss["name"],
            "level": boss["level"],
            "prev_state": state_label(ch.previous.bucket, labels),
            "new_state": state_label(ch.current.bucket, labels),
            "prev_color": ch.previous.hex,
            "new_color": ch.current.hex,
            "prev_bucket": ch.previous.bucket,
            "new_bucket": ch.current.bucket,
            "detected_at": ts.isoformat(timespec="seconds"),
            "discord_status": "pending",
            "discord_error": None,
        }
        url = self._webhook_url()
        if not url:
            ev["discord_status"] = "not_configured"
        with self.lock:
            self.events.insert(0, ev)
            del self.events[2000:]
            self.changes_count += 1
            self.last_change[boss["id"]] = ev["detected_at"]
            self._save_events()
        log.info("Mudança detectada: %s — %s → %s", boss["name"], ev["prev_state"], ev["new_state"])
        if url:
            self.discord.enqueue(ev["id"], format_change_message(
                boss["name"], boss["level"], ev["prev_state"], ev["new_state"], ts))
        self.publish({"type": "event", "event": ev})

    # ------------------------------------------------------------------ snapshot
    def snapshot(self) -> dict:
        cfg = self.cfg.get()
        labels = cfg.get("state_labels") or {}
        bosses = []
        for b in cfg["bosses"]:
            st = self.tracker.stable.get(b["id"])
            r = self.tracker.last_reading.get(b["id"])
            cand = self.tracker.candidates.get(b["id"])
            if not b.get("enabled", True):
                status = "disabled"
            elif cand is not None:
                status = "confirming"
            elif r is not None and not r.valid:
                status = "unreadable"
            elif st is not None:
                status = "ok"
            else:
                status = "waiting"
            bosses.append({
                "id": b["id"], "name": b["name"], "level": b["level"], "row": b["row"], "enabled": b.get("enabled", True),
                "state": state_label(st.bucket, labels) if st else None,
                "bucket": st.bucket if st else None,
                "color_hex": st.hex if st else None,
                "color_name": BUCKET_NAMES_PT.get(st.bucket) if st else None,
                "since": st.since if st else None,
                "last_change": self.last_change.get(b["id"]),
                "last_seen": self.tracker.last_seen.get(b["id"]),
                "monitor_status": status,
                "reason": (r.reason if (r is not None and not r.valid) else None),
                "live_hex": (r.hex if (r is not None and r.valid) else None),
            })
        cal = cfg["calibration"]
        with self.lock:
            return {
                "agent": {"version": VERSION, "started_at": self.started_at, "windows": win32.IS_WINDOWS,
                          "ocr_available": self.ocr_available},
                "monitoring": {
                    "active": self.active, "status_text": self.status_text,
                    "last_update": self.last_update, "last_attempt": self.last_attempt,
                    "next_update_at": self.next_update_at, "interval_seconds": cfg["monitor"]["interval_seconds"],
                    "cycle_count": self.cycle_count, "last_error": self.last_error, "last_error_at": self.last_error_at,
                    "list_ok": self.list_ok, "valid_rows": self.valid_rows, "rows": cal.get("rows"),
                },
                "window": self.window_info,
                "discord": {"status": self.discord.status, "configured": bool(self._webhook_url()),
                            "last_ok": self.discord.last_ok, "last_error": self.discord.last_error},
                "calibration": {"calibrated": bool(cal.get("raid_button") and cal.get("list_region")),
                                "reference_ready": self.references is not None,
                                "client_size": cal.get("client_size")},
                "bosses": bosses,
                "monitored_count": sum(1 for b in cfg["bosses"] if b.get("enabled", True)),
                "changes_count": self.changes_count,
                "logs": list(self.logs)[-60:],
            }

    # ------------------------------------------------------------------ ações manuais (painel)
    def calibration_screenshot(self) -> dict:
        cfg = self.cfg.get()
        with self.device_lock:
            win = self._locate(cfg, need_foreground=False, force_front=True)
            time.sleep(0.3)
            try:
                img = grab(win.left, win.top, win.width, win.height)
            except CaptureError as exc:
                raise CycleError(str(exc)) from exc
            if is_blank_capture(img):
                raise CycleError("A captura veio vazia/preta. Use o jogo em modo janela ou tela cheia sem bordas.")
        return {"image": to_data_url(img, "jpg", 90), "width": win.width, "height": win.height,
                "window": win.to_dict(), "calibration": cfg["calibration"]}

    def save_calibration(self, raid_button: Optional[dict], list_region: Optional[dict], rows: int) -> dict:
        cfg = self.cfg.get()
        with self.device_lock:
            win = self._locate(cfg, need_foreground=False)
            self.cfg.set_calibration(raid_button, list_region, rows, [win.width, win.height])
            if self.ref_path.exists():
                self.ref_path.unlink()
            self.references = None
            self.tracker.reset()
            self.last_change = {}
            self._save_state()
        log.info("Calibração salva (%sx%s). Capture a referência da lista.", win.width, win.height)
        self._notify()
        return self.cfg.public_view()["calibration"]

    def capture_reference(self, click_first: bool = True) -> dict:
        cfg = self.cfg.get()
        m = cfg["monitor"]
        rows = int(cfg["calibration"]["rows"])
        with self.device_lock:
            win = self._locate(cfg, need_foreground=(click_first and m["click_mode"] == "mouse"), force_front=True)
            self._check_calibration(cfg, win, need_reference=False)
            if click_first:
                try:
                    click_raid_twice(win, cfg["calibration"]["raid_button"], m["click_mode"],
                                     int(m["click_delay_ms"]), bool(m["restore_mouse"]))
                except ClickError as exc:
                    raise CycleError(str(exc)) from exc
                time.sleep(int(m["after_click_wait_ms"]) / 1000)
            img = self._capture_list(cfg, win)
            readings = analyze_list(img, rows, None)
            valid = sum(1 for r in readings if r.valid)
            details = self._row_details(cfg, img, readings)
            if valid * 100 < rows * int(m["min_valid_rows_pct"]):
                return {"ok": False, "message": f"Apenas {valid}/{rows} linhas com texto. Ajuste a área da lista "
                                                f"e o número de linhas.", "image": to_data_url(img, "png"),
                        "rows": details}
            masks = row_masks(img, rows)
            np.savez_compressed(self.ref_path, rows=np.array(rows), size=np.array([img.shape[1], img.shape[0]]),
                                **{f"row_{i}": mk for i, mk in enumerate(masks)})
            self.references = masks
            self.tracker.reset()
            self.tracker.observe(self._readings_by_boss(cfg, readings))  # linha de base, sem notificações
            self.last_change = {}
            self._save_state()
        log.info("Referência da lista capturada (%s/%s linhas).", valid, rows)
        self._notify()
        return {"ok": True, "message": f"Referência salva com {valid}/{rows} linhas reconhecidas. "
                                       "Estado atual registrado como ponto de partida.",
                "image": to_data_url(img, "png"), "rows": details}

    def _row_details(self, cfg: dict, img: np.ndarray, readings: list[RowReading]) -> list[dict]:
        by_row = {int(b["row"]): b for b in cfg["bosses"]}
        crops = split_rows(img, len(readings)) if self.ocr_available else []
        out = []
        for i, r in enumerate(readings):
            boss = by_row.get(i + 1)
            d = r.to_dict()
            d["row"] = i + 1
            d["boss_name"] = boss["name"] if boss else None
            d["state"] = state_label(r.bucket, cfg.get("state_labels") or {}) if r.valid else None
            if self.ocr_available and i < len(crops):
                text = _ocr_row(crops[i])
                d["ocr_text"] = text
                d["ocr_match"] = round(_name_similarity(text or "", boss["name"]), 2) if (boss and text) else None
            out.append(d)
        return out

    def test_capture(self) -> dict:
        cfg = self.cfg.get()
        with self.device_lock:
            win = self._locate(cfg, need_foreground=False, force_front=True)
            time.sleep(0.3)
            cal = cfg["calibration"]
            if not cal.get("list_region"):
                img = grab(win.left, win.top, win.width, win.height)
                return {"ok": not is_blank_capture(img), "message": "Captura da janela inteira (área da lista ainda "
                        "não calibrada).", "image": to_data_url(img, "jpg", 85, 1280), "rows": [],
                        "window": win.to_dict()}
            self._check_calibration(cfg, win, need_reference=False)
            img = self._capture_list(cfg, win)
            readings = analyze_list(img, int(cal["rows"]), self.references, float(cfg["monitor"]["row_match_threshold"]))
            valid = sum(1 for r in readings if r.valid)
        return {"ok": valid > 0, "message": f"Captura OK: {valid}/{cal['rows']} linhas reconhecidas.",
                "image": to_data_url(img, "png"), "rows": self._row_details(cfg, img, readings),
                "window": win.to_dict()}

    def test_clicks(self) -> dict:
        cfg = self.cfg.get()
        m = cfg["monitor"]
        with self.device_lock:
            win = self._locate(cfg, need_foreground=(m["click_mode"] == "mouse"), force_front=True)
            self._check_calibration(cfg, win, need_reference=False)
            try:
                click_raid_twice(win, cfg["calibration"]["raid_button"], m["click_mode"],
                                 int(m["click_delay_ms"]), bool(m["restore_mouse"]))
            except ClickError as exc:
                raise CycleError(str(exc)) from exc
            time.sleep(int(m["after_click_wait_ms"]) / 1000)
            img = self._capture_list(cfg, win)
            rows = int(cfg["calibration"]["rows"])
            readings = analyze_list(img, rows, self.references, float(m["row_match_threshold"]))
            valid = sum(1 for r in readings if r.valid)
        ok = valid * 100 >= rows * int(m["min_valid_rows_pct"])
        msg = (f"Dois cliques executados e lista verificada: {valid}/{rows} linhas reconhecidas."
               if ok else f"Cliques executados, mas a lista não foi reconhecida ({valid}/{rows} linhas).")
        return {"ok": ok, "message": msg, "image": to_data_url(img, "png"),
                "rows": self._row_details(cfg, img, readings)}

    def test_discord(self) -> dict:
        ts = datetime.now()
        content = ("🛡️ **GUARDIAN RAID WATCH**\n\nTeste de conexão com o Discord concluído. "
                   f"As notificações de Raid Boss chegarão neste canal.\nHorário: {ts.strftime('%H:%M:%S')}")
        ok, err = self.discord.send_now(content)
        self._notify()
        return {"ok": ok, "message": "Mensagem de teste enviada ao Discord." if ok else err}

    def clear_events(self) -> None:
        with self.lock:
            self.events = []
            self._save_events()
        self._notify()

    def reset_boss_states(self) -> None:
        with self.lock:
            self.tracker.reset()
            self.last_change = {}
            self._save_state()
        log.info("Estados registrados apagados; a próxima leitura será o novo ponto de partida.")
        self._notify()
