"""Lista padrão dos 11 Raid Bosses monitorados (ordem da lista RAID no jogo)."""

DEFAULT_BOSSES = [
    ("gourd", "Gourd", 87),
    ("immortal-gourd", "Immortal Gourd", 87),
    ("palibati-queen-themis", "Palibati Queen Themis", 90),
    ("lilith", "Lilith", 90),
    ("anakim", "Anakim", 90),
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
