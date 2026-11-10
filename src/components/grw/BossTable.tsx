import type { BossSnapshot } from "@/lib/agent/types";
import { DEFAULT_BOSSES } from "@/lib/bosses";
import { fmtAgo, fmtTime } from "@/lib/format";
import { ColorSwatch, MonitorStatusBadge, StateChip } from "./badges";

const OFFLINE: BossSnapshot[] = DEFAULT_BOSSES.map((b, i) => ({
  ...b,
  row: i + 1,
  enabled: true,
  state: null,
  bucket: null,
  color_hex: null,
  color_name: null,
  since: null,
  last_change: null,
  last_seen: null,
  monitor_status: "waiting",
  reason: null,
  live_hex: null,
}));

export function BossTable({ bosses }: { bosses: BossSnapshot[] | undefined }) {
  const rows = bosses && bosses.length ? bosses : OFFLINE;
  let lastLevel = 0;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
            <th className="px-3 py-2 font-display font-semibold">Boss</th>
            <th className="px-3 py-2 font-display font-semibold">Nível</th>
            <th className="px-3 py-2 font-display font-semibold">Estado atual</th>
            <th className="px-3 py-2 font-display font-semibold">Cor detectada</th>
            <th className="px-3 py-2 font-display font-semibold">Última alteração</th>
            <th className="px-3 py-2 font-display font-semibold">Monitoramento</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const header = b.level !== lastLevel;
            lastLevel = b.level;
            return (
              <tr
                key={b.id}
                className={`border-b border-border/50 transition-colors hover:bg-secondary/40 ${header ? "border-t-2 border-t-gold-dim/30" : ""} ${b.bucket === "red" ? "bg-battle/5" : ""}`}
              >
                <td className="px-3 py-2.5 font-semibold text-foreground">
                  <span className="data-mono mr-2 text-xs text-muted-foreground">
                    {String(b.row).padStart(2, "0")}
                  </span>
                  {b.name}
                </td>
                <td className="data-mono px-3 py-2.5 text-sm text-gold">Lv.{b.level}</td>
                <td className="px-3 py-2.5">
                  <StateChip state={b.state} bucket={b.bucket} hex={b.color_hex} />
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-2 text-sm">
                    <ColorSwatch hex={b.color_hex} />
                    <span className="text-foreground">{b.color_name ?? "—"}</span>
                    {b.color_hex && (
                      <span className="data-mono text-xs text-muted-foreground">{b.color_hex}</span>
                    )}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-sm">
                  {b.last_change ? (
                    <>
                      <span className="data-mono text-foreground">{fmtTime(b.last_change)}</span>{" "}
                      <span className="text-muted-foreground">{fmtAgo(b.last_change)}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <MonitorStatusBadge status={b.monitor_status} reason={b.reason} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
