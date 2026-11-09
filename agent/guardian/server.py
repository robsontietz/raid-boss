"""Servidor local (somente 127.0.0.1) usado pelo painel web.

Segurança:
  * escuta apenas em 127.0.0.1 (nenhuma porta exposta à internet);
  * toda rota (exceto /api/health) exige o token do arquivo data/config.json;
  * o cabeçalho Host precisa ser localhost/127.0.0.1 (proteção contra DNS rebinding).
"""
from __future__ import annotations

import asyncio
import hmac
import json
import logging
from typing import Optional

from aiohttp import WSMsgType, web

from . import VERSION
from . import window as win32
from .config import ConfigStore
from .monitor import CycleError, Monitor

log = logging.getLogger("guardian.server")


class Hub:
    """Distribui mensagens do agente para os painéis conectados (WebSocket)."""

    def __init__(self) -> None:
        self.loop: Optional[asyncio.AbstractEventLoop] = None
        self.clients: set[web.WebSocketResponse] = set()

    def publish(self, msg: dict) -> None:
        loop = self.loop
        if loop is None or loop.is_closed():
            return
        data = json.dumps(msg, ensure_ascii=False)
        loop.call_soon_threadsafe(lambda: asyncio.ensure_future(self._broadcast(data)))

    async def _broadcast(self, data: str) -> None:
        dead = []
        for ws in list(self.clients):
            try:
                await ws.send_str(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.clients.discard(ws)


def build_app(config: ConfigStore, monitor: Monitor, hub: Hub) -> web.Application:
    port = config.get()["server"]["port"]
    allowed_hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}

    def cors_headers(request: web.Request) -> dict:
        origin = request.headers.get("Origin", "*")
        return {
            "Access-Control-Allow-Origin": origin,
            "Vary": "Origin",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Agent-Token",
            "Access-Control-Allow-Private-Network": "true",
            "Access-Control-Max-Age": "600",
        }

    def authorized(request: web.Request, token: Optional[str]) -> bool:
        return bool(token) and hmac.compare_digest(token, config.token)

    @web.middleware
    async def guard(request: web.Request, handler):
        if request.host not in allowed_hosts:
            return web.json_response({"error": "Host não permitido"}, status=403)
        if request.method == "OPTIONS":
            return web.Response(status=204, headers=cors_headers(request))
        public = request.path in ("/api/health", "/ws")
        if not public and not authorized(request, request.headers.get("X-Agent-Token")):
            resp = web.json_response({"error": "Token inválido. Copie o token exibido na janela do agente."},
                                     status=401)
        else:
            try:
                resp = await handler(request)
            except CycleError as exc:
                resp = web.json_response({"ok": False, "message": str(exc)}, status=409)
            except ValueError as exc:
                resp = web.json_response({"ok": False, "message": str(exc)}, status=400)
            except web.HTTPException:
                raise
            except Exception as exc:  # noqa: BLE001
                log.exception("Erro na requisição %s", request.path)
                resp = web.json_response({"ok": False, "message": f"Erro interno: {exc}"}, status=500)
        if not isinstance(resp, web.WebSocketResponse):
            resp.headers.update(cors_headers(request))
        return resp

    async def run_blocking(fn, *args):
        return await asyncio.get_running_loop().run_in_executor(None, fn, *args)

    async def health(_r):
        return web.json_response({"name": "guardian-raid-watch-agent", "version": VERSION})

    async def ws_handler(request: web.Request):
        if not authorized(request, request.query.get("token")):
            return web.json_response({"error": "Token inválido"}, status=401, headers=cors_headers(request))
        ws = web.WebSocketResponse(heartbeat=20)
        await ws.prepare(request)
        hub.clients.add(ws)
        await ws.send_str(json.dumps({"type": "snapshot", "data": monitor.snapshot()}, ensure_ascii=False))
        await ws.send_str(json.dumps({"type": "events", "events": monitor.events[:300]}, ensure_ascii=False))
        try:
            async for msg in ws:
                if msg.type == WSMsgType.TEXT and msg.data == "ping":
                    await ws.send_str('{"type":"pong"}')
                elif msg.type == WSMsgType.ERROR:
                    break
        finally:
            hub.clients.discard(ws)
        return ws

    async def get_state(_r):
        return web.json_response(monitor.snapshot())

    async def get_config(_r):
        return web.json_response(config.public_view())

    async def put_config(request):
        patch = await request.json()
        view = config.update(patch)
        monitor.apply_config()
        return web.json_response({"ok": True, "config": view})

    async def get_events(request):
        limit = min(2000, int(request.query.get("limit", "500")))
        return web.json_response(monitor.events[:limit])

    async def clear_events(_r):
        monitor.clear_events()
        hub.publish({"type": "events", "events": []})
        return web.json_response({"ok": True})

    async def start(_r):
        monitor.start()
        return web.json_response({"ok": True})

    async def stop(_r):
        monitor.stop()
        return web.json_response({"ok": True})

    async def run_now(_r):
        monitor.run_now()
        return web.json_response({"ok": True})

    async def reset_states(_r):
        monitor.reset_boss_states()
        return web.json_response({"ok": True})

    async def windows(_r):
        items = await run_blocking(win32.list_windows)
        return web.json_response([{"title": w["title"], "process": w["process"]} for w in items])

    async def cal_screenshot(_r):
        return web.json_response(await run_blocking(monitor.calibration_screenshot))

    async def cal_save(request):
        body = await request.json()
        result = await run_blocking(monitor.save_calibration, body.get("raid_button"), body.get("list_region"),
                                    int(body.get("rows") or 20))
        return web.json_response({"ok": True, "calibration": result})

    async def cal_reference(request):
        body = await request.json() if request.can_read_body else {}
        return web.json_response(await run_blocking(monitor.capture_reference, bool(body.get("click", True))))

    async def test_capture(_r):
        return web.json_response(await run_blocking(monitor.test_capture))

    async def test_clicks(_r):
        return web.json_response(await run_blocking(monitor.test_clicks))

    async def test_discord(_r):
        return web.json_response(await run_blocking(monitor.test_discord))

    async def on_startup(app):
        hub.loop = asyncio.get_running_loop()

    app = web.Application(middlewares=[guard], client_max_size=4 * 1024 * 1024)
    app.on_startup.append(on_startup)
    app.router.add_get("/api/health", health)
    app.router.add_get("/ws", ws_handler)
    app.router.add_get("/api/state", get_state)
    app.router.add_get("/api/config", get_config)
    app.router.add_put("/api/config", put_config)
    app.router.add_get("/api/events", get_events)
    app.router.add_delete("/api/events", clear_events)
    app.router.add_post("/api/monitor/start", start)
    app.router.add_post("/api/monitor/stop", stop)
    app.router.add_post("/api/monitor/run-now", run_now)
    app.router.add_post("/api/monitor/reset-states", reset_states)
    app.router.add_get("/api/windows", windows)
    app.router.add_post("/api/calibration/screenshot", cal_screenshot)
    app.router.add_post("/api/calibration/save", cal_save)
    app.router.add_post("/api/calibration/reference", cal_reference)
    app.router.add_post("/api/test/capture", test_capture)
    app.router.add_post("/api/test/clicks", test_clicks)
    app.router.add_post("/api/test/discord", test_discord)
    # Pré-flight CORS (OPTIONS) é respondido pelo middleware "guard".
    return app
