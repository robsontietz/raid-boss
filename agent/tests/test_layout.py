"""A lista RAID do jogo tem 20 nomes; os 11 bosses monitorados ficam na linha real de cada um."""
import json
import os
import sys
import tempfile

import cv2

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from guardian.bosses import LIST_ROWS, RAID_LIST, default_boss_config  # noqa: E402
from guardian.config import ConfigStore  # noqa: E402
from guardian.detector import analyze_list, row_masks  # noqa: E402

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "raid_list_20.png")


def test_game_list_has_20_rows():
    assert LIST_ROWS == 20


def test_monitored_bosses_sit_on_their_real_game_rows():
    rows = {b["name"]: b["row"] for b in default_boss_config()}
    assert rows == {
        "Gourd": 5, "Immortal Gourd": 6, "Palibati Queen Themis": 8, "Lilith": 12, "Anakim": 13,
        "Floki": 15, "Bjorn": 16, "Ivar": 17, "Zahir": 18, "Rashid": 19, "Krusha": 20,
    }
    for name, row in rows.items():
        assert RAID_LIST[row - 1] == name


def test_new_config_reads_all_20_rows():
    assert ConfigStore(tempfile.mkdtemp()).get()["calibration"]["rows"] == 20


def test_old_11_row_config_is_upgraded():
    d = tempfile.mkdtemp()
    old = {
        "server": {"host": "127.0.0.1", "port": 8765, "token": "keep-me"},
        "discord": {"webhook_url": "https://discord.com/api/webhooks/1/x", "enabled": True},
        "calibration": {"raid_button": {"x": 200, "y": 20}, "list_region": {"x": 4, "y": 47, "w": 396, "h": 575},
                        "rows": 11, "client_size": [1280, 720]},
        "bosses": [{"id": "krusha", "row": 11, "enabled": False}, {"id": "gourd", "row": 1, "enabled": True}],
    }
    with open(os.path.join(d, "config.json"), "w", encoding="utf-8") as f:
        json.dump(old, f)
    cfg = ConfigStore(d).get()
    assert cfg["calibration"]["rows"] == 20
    by_id = {b["id"]: b for b in cfg["bosses"]}
    assert by_id["krusha"]["row"] == 20
    assert by_id["krusha"]["enabled"] is False  # escolha do usuário preservada
    assert by_id["gourd"]["row"] == 5
    assert cfg["server"]["token"] == "keep-me"
    assert cfg["discord"]["webhook_url"].endswith("/1/x")
    assert cfg["calibration"]["raid_button"] == {"x": 200, "y": 20}


def test_real_game_screenshot_reads_all_20_names_as_standby_gray():
    img = cv2.imread(FIXTURE)
    region = img[47:622, 4:400]  # área sobre os 20 nomes, como o usuário marcaria
    refs = row_masks(region, LIST_ROWS)
    readings = analyze_list(region, LIST_ROWS, refs, 0.65)
    assert all(r.valid for r in readings)
    assert {r.bucket for r in readings} == {"gray"}
