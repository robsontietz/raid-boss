/** Every name in the in-game RAID list, in order (row 1 = first). The game still shows all 20. */
export const RAID_LIST = [
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
] as const;

export const LIST_ROWS = RAID_LIST.length;

/** The 11 monitored Raid Bosses (shown while the agent is offline). Their row is their position in RAID_LIST. */
export const DEFAULT_BOSSES = [
  { id: "gourd", name: "Gourd", level: 87 },
  { id: "immortal-gourd", name: "Immortal Gourd", level: 87 },
  { id: "palibati-queen-themis", name: "Palibati Queen Themis", level: 90 },
  { id: "lilith", name: "Lilith", level: 90 },
  { id: "anakim", name: "Anakim", level: 90 },
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

/** Agent version shipped in the download; older agents misread the 20-row list and click less reliably. */
export const AGENT_MIN_VERSION = "1.1.0";

export function isOlderVersion(version: string | null | undefined, min: string): boolean {
  if (!version) return false;
  const a = version.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const b = min.split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d < 0;
  }
  return false;
}
