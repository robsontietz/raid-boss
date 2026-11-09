import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", { hour12: false });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour12: false })}`;
}

export function fmtAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `há ${formatDistanceToNowStrict(d, { locale: ptBR })}`;
}

export function fmtCountdown(targetIso: string | null | undefined, now: number): string {
  if (!targetIso) return "—";
  const ms = new Date(targetIso).getTime() - now;
  if (Number.isNaN(ms)) return "—";
  if (ms <= 0) return "agora";
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`;
}
