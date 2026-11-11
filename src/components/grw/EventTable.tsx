import { ArrowRight } from "lucide-react";

import type { RaidEvent } from "@/lib/agent/types";
import { fmtDateTime } from "@/lib/format";
import { ColorSwatch, DeliveryBadge } from "./badges";

export function EventTable({ events, empty }: { events: RaidEvent[]; empty?: string | undefined }) {
  if (!events.length) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        {empty ?? "Nenhuma alteração detectada ainda."}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
            <th className="px-3 py-2 font-display font-semibold">Horário</th>
            <th className="px-3 py-2 font-display font-semibold">Boss</th>
            <th className="px-3 py-2 font-display font-semibold">Mudança de estado</th>
            <th className="px-3 py-2 font-display font-semibold">Discord</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="animate-rise border-b border-border/50 hover:bg-secondary/40">
              <td className="data-mono px-3 py-2.5 text-sm text-muted-foreground">
                {fmtDateTime(e.detected_at)}
              </td>
              <td className="px-3 py-2.5 font-semibold">
                {e.boss_name} <span className="data-mono text-xs text-gold">Lv.{e.level}</span>
              </td>
              <td className="px-3 py-2.5 text-sm">
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <ColorSwatch hex={e.prev_color} />
                    {e.prev_state}
                  </span>
                  <ArrowRight className="size-4 text-gold" />
                  <span
                    className={`inline-flex items-center gap-1.5 font-semibold ${e.new_bucket === "red" ? "text-battle" : "text-foreground"}`}
                  >
                    <ColorSwatch hex={e.new_color} />
                    {e.new_state}
                  </span>
                </span>
              </td>
              <td className="px-3 py-2.5">
                <DeliveryBadge status={e.discord_status} error={e.discord_error} />
                {e.discord_error && e.discord_status === "failed" && (
                  <p className="mt-1 text-xs text-destructive">{e.discord_error}</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
