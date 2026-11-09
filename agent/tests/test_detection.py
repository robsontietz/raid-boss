"""Testes das regras de detecção (rodam em qualquer sistema: não usam Windows)."""
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from guardian.bosses import DEFAULT_BOSSES  # noqa: E402
from guardian.detector import analyze_list, row_masks  # noqa: E402
from guardian.tracker import BossTracker, state_label  # noqa: E402

GRAY = (150, 150, 150)  # BGR
RED = (40, 40, 225)
YELLOW = (60, 210, 230)
BG = (22, 18, 16)
ROW_H = 22


def render(colors: dict[int, tuple], brightness: float = 1.0, noise: float = 0.0, seed: int = 1) -> np.ndarray:
    """Desenha a lista RAID sintética: 20 linhas com '[Lv.XX] Nome'."""
    img = np.zeros((ROW_H * len(DEFAULT_BOSSES), 320, 3), np.uint8)
    img[:] = BG
    for i, (_bid, name, lvl) in enumerate(DEFAULT_BOSSES):
        color = colors.get(i, GRAY)
        color = tuple(int(min(255, c * brightness)) for c in color)
        cv2.putText(img, f"[Lv.{lvl}] {name}", (6, i * ROW_H + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1,
                    cv2.LINE_AA)
    if noise:
        rng = np.random.default_rng(seed)
        img = np.clip(img.astype(np.float32) + rng.normal(0, noise, img.shape), 0, 255).astype(np.uint8)
    return img


def readings_map(img, refs):
    rs = analyze_list(img, len(DEFAULT_BOSSES), refs)
    return {DEFAULT_BOSSES[i][0]: r for i, r in enumerate(rs)}


def make_tracker(confirm=2):
    return BossTracker(sensitivity=5, confirm_reads=confirm)


def test_baseline_is_not_a_change():
    base = render({})
    refs = row_masks(base, 20)
    t = make_tracker()
    assert t.observe(readings_map(base, refs)) == []
    assert len(t.stable) == 20
    assert all(s.bucket == "gray" for s in t.stable.values())


def test_gray_to_red_on_zaken_is_detected_after_confirmation():
    base = render({})
    refs = row_masks(base, 20)
    t = make_tracker(confirm=2)
    t.observe(readings_map(base, refs))
    battle = render({3: RED})  # Zaken of Chaos é a 4ª linha
    first = t.observe(readings_map(battle, refs))
    assert first == []  # ainda confirmando
    second = t.observe(readings_map(battle, refs))
    assert [c.boss_id for c in second] == ["zaken-of-chaos"]
    assert second[0].previous.bucket == "gray"
    assert second[0].current.bucket == "red"
    labels = {"gray": "Standby", "red": "In Battle"}
    assert state_label(second[0].previous.bucket, labels) == "Standby"
    assert state_label(second[0].current.bucket, labels) == "In Battle"


def test_any_of_the_20_bosses_can_trigger():
    base = render({})
    refs = row_masks(base, 20)
    for idx in (0, 10, 19):
        t = make_tracker(confirm=1)
        t.observe(readings_map(base, refs))
        ch = t.observe(readings_map(render({idx: RED}), refs))
        assert [c.boss_id for c in ch] == [DEFAULT_BOSSES[idx][0]]


def test_staying_in_new_color_does_not_repeat_notification():
    base = render({})
    refs = row_masks(base, 20)
    t = make_tracker(confirm=1)
    t.observe(readings_map(base, refs))
    battle = render({3: RED})
    assert len(t.observe(readings_map(battle, refs))) == 1
    for _ in range(10):
        assert t.observe(readings_map(battle, refs)) == []


def test_new_change_later_notifies_again():
    base = render({})
    refs = row_masks(base, 20)
    t = make_tracker(confirm=1)
    t.observe(readings_map(base, refs))
    assert len(t.observe(readings_map(render({3: RED}), refs))) == 1
    back = t.observe(readings_map(base, refs))
    assert [c.boss_id for c in back] == ["zaken-of-chaos"]
    assert back[0].current.bucket == "gray"


def test_brightness_and_noise_variation_is_not_a_change():
    base = render({3: RED})
    refs = row_masks(base, 20)
    t = make_tracker(confirm=1)
    t.observe(readings_map(base, refs))
    for b, n, s in ((0.8, 0, 1), (1.12, 0, 1), (1.0, 4, 2), (0.9, 3, 3)):
        assert t.observe(readings_map(render({3: RED}, brightness=b, noise=n, seed=s), refs)) == []


def test_unknown_color_is_reported_without_assuming_meaning():
    base = render({})
    refs = row_masks(base, 20)
    t = make_tracker(confirm=1)
    t.observe(readings_map(base, refs))
    ch = t.observe(readings_map(render({14: YELLOW}), refs))
    assert [c.boss_id for c in ch] == ["floki"]
    assert ch[0].current.bucket == "yellow"
    assert state_label("yellow", {"gray": "Standby", "red": "In Battle"}) == "Outra cor (Amarelo)"


def test_capture_failure_is_never_a_change():
    base = render({})
    refs = row_masks(base, 20)
    t = make_tracker(confirm=1)
    t.observe(readings_map(base, refs))
    black = np.zeros_like(base)
    other_window = np.full_like(base, 200)
    for img in (black, other_window):
        rs = readings_map(img, refs)
        assert not any(r.valid for r in rs.values())
        assert t.observe(rs) == []
    # Estado anterior preservado
    assert all(s.bucket == "gray" for s in t.stable.values())


def test_different_text_in_row_is_rejected_by_reference():
    base = render({})
    refs = row_masks(base, 20)
    shuffled = np.roll(base, ROW_H * 3, axis=0)  # nomes em outras linhas
    rs = analyze_list(shuffled, 20, refs)
    assert sum(1 for r in rs if r.valid) < 14


def test_single_glitch_frame_does_not_notify_with_confirmation():
    base = render({})
    refs = row_masks(base, 20)
    t = make_tracker(confirm=2)
    t.observe(readings_map(base, refs))
    assert t.observe(readings_map(render({5: RED}), refs)) == []  # 1 quadro estranho
    assert t.observe(readings_map(base, refs)) == []  # voltou ao normal
    assert t.observe(readings_map(base, refs)) == []
    assert not t.has_pending()
