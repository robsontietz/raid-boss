import { ArrowRight } from "lucide-react";

import type { RaidEvent } from "@/lib/agent/types";
import { fmtDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localizeState } from "@/lib/i18n/messages";
import { ColorSwatch, DeliveryBadge } from "./badges";

export function EventTable({ events, empty }: { events: RaidEvent[]; empty?: string | undefined }) {
  const { t, lang } = useI18n();
  if (!events.length) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        {empty ?? t.eventTable.empty}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
            <th className="px-3 py-2 font-display font-semibold">{t.eventTable.time}</th>
            <th className="px-3 py-2 font-display font-semibold">{t.eventTable.boss}</th>
            <th className="px-3 py-2 font-display font-semibold">{t.eventTable.change}</th>
            <th className="px-3 py-2 font-display font-semibold">{t.eventTable.discord}</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="animate-rise border-b border-border/50 hover:bg-secondary/40">
              <td className="data-mono px-3 py-2.5 text-sm text-muted-foreground">
                {fmtDateTime(e.detected_at, lang)}
              </td>
              <td className="px-3 py-2.5 font-semibold">
                {e.boss_name} <span className="data-mono text-xs text-gold">Lv.{e.level}</span>
              </td>
              <td className="px-3 py-2.5 text-sm">
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <ColorSwatch hex={e.prev_color} />
                    {localizeState(e.prev_state, lang)}
                  </span>
                  <ArrowRight className="size-4 text-gold" />
                  <span
                    className={`inline-flex items-center gap-1.5 font-semibold ${e.new_bucket === "red" ? "text-battle" : "text-foreground"}`}
                  >
                    <ColorSwatch hex={e.new_color} />
                    {localizeState(e.new_state, lang)}
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
