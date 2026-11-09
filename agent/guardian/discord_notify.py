"""Envio de notificações ao Discord via Webhook (fila com novas tentativas)."""
from __future__ import annotations

import logging
import queue
import threading
import time
from datetime import datetime
from typing import Callable, Optional

import requests

log = logging.getLogger("guardian.discord")


def format_change_message(boss_name: str, level: int, prev_state: str, new_state: str, when: datetime) -> str:
    lines = [
        "🚨 **GUARDIAN RAID WATCH**",
        "",
        "⚔️ **ALTERAÇÃO DE RAID BOSS DETECTADA!**",
        "",
        f"Boss: {boss_name}",
        f"Nível: {level}",
        f"Estado anterior: {prev_state}",
        f"Novo estado: {new_state}",
        f"Horário: {when.strftime('%H:%M:%S')}",
    ]
    return "\n".join(lines)


def post_webhook(url: str, content: str, timeout: float = 10.0) -> tuple[bool, str, float]:
    """Envia uma mensagem. Retorna (ok, erro, retry_after_segundos)."""
    try:
        r = requests.post(
            url,
            json={"username": "Guardian Raid Watch", "content": content, "allowed_mentions": {"parse": []}},
            timeout=timeout,
        )
    except requests.RequestException as exc:
        return False, f"Erro de conexão: {exc.__class__.__name__}", 5.0
    if 200 <= r.status_code < 300:
        return True, "", 0.0
    if r.status_code == 429:
        try:
            retry = float(r.json().get("retry_after", 2))
        except Exception:
            retry = 2.0
        return False, "Limite de envios do Discord (429)", retry
    if r.status_code in (401, 403, 404):
        return False, f"Webhook inválido ou removido (HTTP {r.status_code})", -1.0
    return False, f"HTTP {r.status_code}", 5.0


class DiscordNotifier:
    def __init__(self, get_url: Callable[[], str], on_result: Callable[[str, str, str], None]):
        self.get_url = get_url
        self.on_result = on_result  # (event_id, status, error)
        self.q: "queue.Queue[tuple[str, str]]" = queue.Queue()
        self.last_ok: Optional[str] = None
        self.last_error: Optional[str] = None
        self.status = "unknown"
        self._thread = threading.Thread(target=self._run, name="discord", daemon=True)
        self._thread.start()

    def enqueue(self, event_id: str, content: str) -> None:
        self.q.put((event_id, content))

    def _mark(self, ok: bool, error: str = "") -> None:
        if ok:
            self.last_ok = datetime.now().astimezone().isoformat(timespec="seconds")
            self.last_error = None
            self.status = "ok"
        else:
            self.last_error = error
            self.status = "error"

    def send_now(self, content: str) -> tuple[bool, str]:
        url = self.get_url()
        if not url:
            self.status = "not_configured"
            return False, "Webhook do Discord não configurado."
        ok, err, _ = post_webhook(url, content)
        self._mark(ok, err)
        return ok, err

    def _run(self) -> None:
        while True:
            event_id, content = self.q.get()
            attempts = 0
            while True:
                url = self.get_url()
                if not url:
                    self.status = "not_configured"
                    self.on_result(event_id, "failed", "Webhook do Discord não configurado.")
                    break
                attempts += 1
                ok, err, retry = post_webhook(url, content)
                self._mark(ok, err)
                if ok:
                    self.on_result(event_id, "sent", "")
                    break
                log.warning("Falha ao enviar ao Discord (tentativa %s): %s", attempts, err)
                if retry < 0 or attempts >= 5:
                    self.on_result(event_id, "failed", err)
                    break
                self.on_result(event_id, "retrying", err)
                time.sleep(min(60.0, max(1.0, retry)))
