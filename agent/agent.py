"""GUARDIAN RAID WATCH — agente local para Windows.

Execute com:  iniciar.bat   (ou: python agent.py)
"""
from __future__ import annotations

import logging
import sys
import webbrowser
from logging.handlers import RotatingFileHandler
from urllib.parse import quote

from guardian import VERSION
from guardian import window as win32

# Precisa vir antes de qualquer captura/clique para as coordenadas baterem com os pixels.
win32.enable_dpi_awareness()

from aiohttp import web  # noqa: E402

from guardian.config import BASE_DIR, ConfigStore  # noqa: E402
from guardian.monitor import Monitor  # noqa: E402
from guardian.server import Hub, build_app  # noqa: E402


def setup_logging() -> None:
    logs = BASE_DIR / "logs"
    logs.mkdir(exist_ok=True)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", "%Y-%m-%d %H:%M:%S")
    file_handler = RotatingFileHandler(logs / "agent.log", maxBytes=2_000_000, backupCount=3, encoding="utf-8")
    file_handler.setFormatter(fmt)
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(fmt)
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.addHandler(file_handler)
    root.addHandler(console)
    logging.getLogger("aiohttp.access").setLevel(logging.WARNING)


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except Exception:
        pass
    setup_logging()
    config = ConfigStore()
    cfg = config.get()
    host, port = cfg["server"]["host"], int(cfg["server"]["port"])
    if host not in ("127.0.0.1", "localhost"):
        logging.warning("Por segurança o agente só escuta em 127.0.0.1 (ignorando host=%s).", host)
        host = "127.0.0.1"

    hub = Hub()
    monitor = Monitor(config, hub.publish)
    app = build_app(config, monitor, hub)

    agent_url = f"http://127.0.0.1:{port}"
    bar = "=" * 64
    print(f"\n{bar}\n  GUARDIAN RAID WATCH — agente v{VERSION}\n{bar}")
    print(f"  Endereço do agente : {agent_url}")
    print(f"  Token de acesso    : {config.token}")
    print("  Cole o endereço e o token no painel web (Configurações > Conexão).")
    if not win32.IS_WINDOWS:
        print("  ATENÇÃO: este computador não é Windows; captura e cliques ficam desativados.")
    print(f"{bar}\n  Deixe esta janela aberta. Para encerrar: CTRL+C\n{bar}\n")

    panel = (cfg.get("panel_url") or "").rstrip("/")
    if panel:
        link = f"{panel}/#agent={quote(agent_url, safe='')}&token={quote(config.token, safe='')}"
        try:
            webbrowser.open(link)
        except Exception:
            pass

    web.run_app(app, host=host, port=port, print=None, access_log=None)


if __name__ == "__main__":
    main()
