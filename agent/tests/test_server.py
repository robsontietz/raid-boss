"""Testes do servidor local: token obrigatório e proteção de Host."""
import asyncio
import os
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from aiohttp.test_utils import TestClient, TestServer  # noqa: E402

from guardian.config import ConfigStore  # noqa: E402
from guardian.monitor import Monitor  # noqa: E402
from guardian.server import Hub, build_app  # noqa: E402


def run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def make():
    d = tempfile.mkdtemp()
    cfg = ConfigStore(d)
    hub = Hub()
    mon = Monitor(cfg, hub.publish)
    return cfg, build_app(cfg, mon, hub)


def test_requires_token_and_localhost_host():
    cfg, app = make()
    port = cfg.get()["server"]["port"]

    async def scenario():
        async with TestClient(TestServer(app)) as c:
            host = {"Host": f"127.0.0.1:{port}"}
            r = await c.get("/api/health", headers=host)
            assert r.status == 200
            r = await c.get("/api/state", headers=host)
            assert r.status == 401
            r = await c.get("/api/state", headers={**host, "X-Agent-Token": "errado"})
            assert r.status == 401
            r = await c.get("/api/state", headers={**host, "X-Agent-Token": cfg.token})
            assert r.status == 200
            data = await r.json()
            assert len(data["bosses"]) == 11
            assert data["monitored_count"] == 11
            r = await c.get("/api/state", headers={"Host": "evil.example.com", "X-Agent-Token": cfg.token})
            assert r.status == 403

    run(scenario())


def test_config_never_returns_webhook_or_token():
    cfg, app = make()
    port = cfg.get()["server"]["port"]
    url = "https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz0123456789SECRET"

    async def scenario():
        async with TestClient(TestServer(app)) as c:
            h = {"Host": f"127.0.0.1:{port}", "X-Agent-Token": cfg.token}
            r = await c.put("/api/config", json={"discord": {"webhook_url": url}}, headers=h)
            assert r.status == 200
            text = await (await c.get("/api/config", headers=h)).text()
            assert "SECRET" not in text
            assert cfg.token not in text
            r = await c.put("/api/config", json={"discord": {"webhook_url": "https://example.com/x"}}, headers=h)
            assert r.status == 400

    run(scenario())
