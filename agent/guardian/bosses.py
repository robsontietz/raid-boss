"""Raid Bosses monitorados e a posição de cada um na lista RAID do jogo.

A lista RAID do jogo continua mostrando os 20 nomes (veja RAID_LIST). O agente
lê a lista inteira e acompanha só os bosses de DEFAULT_BOSSES, cada um na linha
em que aparece no jogo.
"""

# Ordem exata da lista RAID no jogo (linha 1 = primeiro nome).
RAID_LIST = [
    "Core of Chaos",
    "Orfen of Chaos",
    "Chaos Queen Ant",
    "Zaken of Chaos",
    "Gourd",
    "Immortal Gourd",
    "Kuroboros' High Priest",
    "Palibati Queen Themis",
    "Monster Bulleroth",
    "Evil Orc Dephracor",
    "Antharas",
    "Lilith",
    "Anakim",
    "Katuba",
    "Floki",
    "Bjorn",
    "Ivar",
    "Zahir",
    "Rashid",
    "Krusha",
]

LIST_ROWS = len(RAID_LIST)

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
        {"id": bid, "name": name, "level": level, "row": RAID_LIST.index(name) + 1, "enabled": True}
        for bid, name, level in DEFAULT_BOSSES
    ]
