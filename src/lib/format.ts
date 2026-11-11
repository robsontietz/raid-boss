import { formatDistanceToNowStrict } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";

import { MESSAGES, type Lang } from "@/lib/i18n/messages";

const LOCALE_TAG: Record<Lang, string> = { pt: "pt-BR", en: "en-US" };

export function fmtTime(iso: string | null | undefined, lang: Lang = "pt"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(LOCALE_TAG[lang], { hour12: false });
}

export function fmtDateTime(iso: string | null | undefined, lang: Lang = "pt"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString(LOCALE_TAG[lang])} ${d.toLocaleTimeString(LOCALE_TAG[lang], { hour12: false })}`;
}

export function fmtAgo(iso: string | null | undefined, lang: Lang = "pt"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return MESSAGES[lang].time.ago(formatDistanceToNowStrict(d, { locale: lang === "en" ? enUS : ptBR }));
}

export function fmtCountdown(targetIso: string | null | undefined, now: number, lang: Lang = "pt"): string {
  if (!targetIso) return "—";
  const ms = new Date(targetIso).getTime() - now;
  if (Number.isNaN(ms)) return "—";
  if (ms <= 0) return MESSAGES[lang].time.now;
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`;
}
