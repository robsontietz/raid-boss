import { Badge } from "@/components/ui/badge";
import type { BossMonitorStatus, DiscordDelivery } from "@/lib/agent/types";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localizeState } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

/** Swatch of the color actually detected in-game (data-driven, so it uses an inline color). */
export function ColorSwatch({ hex, className }: { hex: string | null | undefined; className?: string }) {
  if (!hex) {
    return (
      <span
        className={cn("inline-block size-3.5 rounded-sm border border-dashed border-border", className)}
        aria-hidden
      />
    );
  }
  return (
    <span
      className={cn("inline-block size-3.5 rounded-sm ring-1 ring-foreground/20", className)}
      style={{ backgroundColor: hex }}
      aria-hidden
    />
  );
}

export function StateChip({
  state,
  bucket,
  hex,
}: {
  state: string | null | undefined;
  bucket: string | null | undefined;
  hex?: string | null;
}) {
  const { lang } = useI18n();
  if (!state) return <span className="text-muted-foreground">—</span>;
  const tone =
    bucket === "red"
      ? "border-battle/50 bg-battle/15 text-battle"
      : bucket === "gray"
        ? "border-standby/40 bg-standby/10 text-standby"
        : "border-gold-dim/50 bg-gold/10 text-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-sm font-semibold",
        tone,
      )}
    >
      {bucket !== "red" && bucket !== "gray" && <ColorSwatch hex={hex} className="size-2.5" />}
      {localizeState(state, lang)}
    </span>
  );
}

type Variant = "success" | "warning" | "danger" | "muted" | "gold";

const MONITOR_VARIANT: Record<BossMonitorStatus, Variant> = {
  ok: "success",
  confirming: "gold",
  unreadable: "danger",
  waiting: "muted",
  disabled: "muted",
};

export function MonitorStatusBadge({ status, reason }: { status: BossMonitorStatus; reason?: string | null }) {
  const { t } = useI18n();
  return (
    <Badge variant={MONITOR_VARIANT[status]} title={reason ?? undefined}>
      {t.monitor[status]}
    </Badge>
  );
}

const DELIVERY_VARIANT: Record<DiscordDelivery, Variant> = {
  pending: "gold",
  retrying: "warning",
  sent: "success",
  failed: "danger",
  not_configured: "muted",
};

export function DeliveryBadge({ status, error }: { status: DiscordDelivery; error?: string | null }) {
  const { t } = useI18n();
  const key: DiscordDelivery = status in DELIVERY_VARIANT ? status : "pending";
  return (
    <Badge variant={DELIVERY_VARIANT[key]} title={error ?? undefined}>
      {t.delivery[key]}
    </Badge>
  );
}

export function PulseDot({ tone }: { tone: "success" | "danger" | "muted" | "warning" }) {
  const color =
    tone === "success"
      ? "bg-success"
      : tone === "danger"
        ? "bg-destructive"
        : tone === "warning"
          ? "bg-warning"
          : "bg-muted-foreground";
  return (
    <span className="relative inline-flex size-2.5">
      {tone === "success" && (
        <span className={cn("absolute inset-0 rounded-full animate-pulse-glow", color)} />
      )}
      <span className={cn("relative inline-flex size-2.5 rounded-full", color)} />
    </span>
  );
}
