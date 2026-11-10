import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatusTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "success" | "danger" | "warning" | "gold";
}) {
  const valueTone = {
    default: "text-foreground",
    success: "text-success",
    danger: "text-destructive",
    warning: "text-warning",
    gold: "text-gold",
  }[tone];
  return (
    <div className="panel-frame flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 text-gold-dim" />
        <span className="eyebrow">{label}</span>
      </div>
      <div className={cn("font-display text-2xl font-bold tracking-wide", valueTone)}>{value}</div>
      {hint && <div className="text-sm text-muted-foreground">{hint}</div>}
    </div>
  );
}
