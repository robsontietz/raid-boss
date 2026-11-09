/** The 20 monitored Raid Bosses, in the in-game RAID list order (shown while the agent is offline). */
export const DEFAULT_BOSSES = [
  { id: "core-of-chaos", name: "Core of Chaos", level: 87 },
  { id: "orfen-of-chaos", name: "Orfen of Chaos", level: 87 },
  { id: "chaos-queen-ant", name: "Chaos Queen Ant", level: 87 },
  { id: "zaken-of-chaos", name: "Zaken of Chaos", level: 87 },
  { id: "gourd", name: "Gourd", level: 87 },
  { id: "immortal-gourd", name: "Immortal Gourd", level: 87 },
  { id: "kuroboros-high-priest", name: "Kuroboros' High Priest", level: 90 },
  { id: "palibati-queen-themis", name: "Palibati Queen Themis", level: 90 },
  { id: "monster-bulleroth", name: "Monster Bulleroth", level: 90 },
  { id: "evil-orc-dephracor", name: "Evil Orc Dephracor", level: 90 },
  { id: "antharas", name: "Antharas", level: 90 },
  { id: "lilith", name: "Lilith", level: 90 },
  { id: "anakim", name: "Anakim", level: 90 },
  { id: "katuba", name: "Katuba", level: 90 },
  { id: "floki", name: "Floki", level: 91 },
  { id: "bjorn", name: "Bjorn", level: 91 },
  { id: "ivar", name: "Ivar", level: 91 },
  { id: "zahir", name: "Zahir", level: 91 },
  { id: "rashid", name: "Rashid", level: 91 },
  { id: "krusha", name: "Krusha", level: 91 },
] as const;

export const COLOR_BUCKETS: { key: string; label: string }[] = [
  { key: "gray", label: "Cinza" },
  { key: "red", label: "Vermelho" },
  { key: "orange", label: "Laranja" },
  { key: "yellow", label: "Amarelo" },
  { key: "green", label: "Verde" },
  { key: "cyan", label: "Ciano" },
  { key: "blue", label: "Azul" },
  { key: "purple", label: "Roxo" },
  { key: "pink", label: "Rosa" },
];

export const DEFAULT_AGENT_URL = "http://127.0.0.1:8765";
export const AGENT_ZIP_PATH = "/downloads/guardian-raid-watch-agent.zip";
