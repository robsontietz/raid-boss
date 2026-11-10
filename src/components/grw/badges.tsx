import { Badge } from "@/components/ui/badge";
import type { BossMonitorStatus, DiscordDelivery } from "@/lib/agent/types";
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
      {state}
    </span>
  );
}

const MONITOR_LABEL: Record<BossMonitorStatus, { label: string; variant: "success" | "warning" | "danger" | "muted" | "gold" }> = {
  ok: { label: "Monitorando", variant: "success" },
  confirming: { label: "Confirmando mudança", variant: "gold" },
  unreadable: { label: "Não lido", variant: "danger" },
  waiting: { label: "Aguardando 1ª leitura", variant: "muted" },
  disabled: { label: "Desativado", variant: "muted" },
};

export function MonitorStatusBadge({ status, reason }: { status: BossMonitorStatus; reason?: string | null }) {
  const m = MONITOR_LABEL[status];
  return (
    <Badge variant={m.variant} title={reason ?? undefined}>
      {m.label}
    </Badge>
  );
}

const DELIVERY: Record<DiscordDelivery, { label: string; variant: "success" | "warning" | "danger" | "muted" | "gold" }> = {
  pending: { label: "Enviando…", variant: "gold" },
  retrying: { label: "Tentando de novo", variant: "warning" },
  sent: { label: "Enviado", variant: "success" },
  failed: { label: "Falhou", variant: "danger" },
  not_configured: { label: "Discord não configurado", variant: "muted" },
};

export function DeliveryBadge({ status, error }: { status: DiscordDelivery; error?: string | null }) {
  const d = DELIVERY[status] ?? DELIVERY.pending;
  return (
    <Badge variant={d.variant} title={error ?? undefined}>
      {d.label}
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
