"""Lista padrão dos 20 Raid Bosses monitorados (ordem da lista RAID no jogo)."""

DEFAULT_BOSSES = [
    ("core-of-chaos", "Core of Chaos", 87),
    ("orfen-of-chaos", "Orfen of Chaos", 87),
    ("chaos-queen-ant", "Chaos Queen Ant", 87),
    ("zaken-of-chaos", "Zaken of Chaos", 87),
    ("gourd", "Gourd", 87),
    ("immortal-gourd", "Immortal Gourd", 87),
    ("kuroboros-high-priest", "Kuroboros' High Priest", 90),
    ("palibati-queen-themis", "Palibati Queen Themis", 90),
    ("monster-bulleroth", "Monster Bulleroth", 90),
    ("evil-orc-dephracor", "Evil Orc Dephracor", 90),
    ("antharas", "Antharas", 90),
    ("lilith", "Lilith", 90),
    ("anakim", "Anakim", 90),
    ("katuba", "Katuba", 90),
    ("floki", "Floki", 91),
    ("bjorn", "Bjorn", 91),
    ("ivar", "Ivar", 91),
    ("zahir", "Zahir", 91),
    ("rashid", "Rashid", 91),
    ("krusha", "Krusha", 91),
]


def default_boss_config() -> list[dict]:
    return [
        {"id": bid, "name": name, "level": level, "row": i + 1, "enabled": True}
        for i, (bid, name, level) in enumerate(DEFAULT_BOSSES)
    ]
