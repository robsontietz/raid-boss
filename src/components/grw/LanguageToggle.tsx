import { useI18n } from "@/lib/i18n/I18nProvider";
import { MESSAGES, type Lang } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

/* Flag artwork uses the flags' official colors, so the SVG fills are fixed by design. */
function FlagBR({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" className={className} aria-hidden>
      <rect width="28" height="20" fill="#009C3B" />
      <path d="M14 2.2 25.4 10 14 17.8 2.6 10z" fill="#FFDF00" />
      <circle cx="14" cy="10" r="4.6" fill="#002776" />
      <path d="M9.6 9.1c3-.6 6.1-.2 8.8 1.3" stroke="#FFFFFF" strokeWidth="0.9" fill="none" />
    </svg>
  );
}

function FlagUS({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" className={className} aria-hidden>
      <rect width="28" height="20" fill="#FFFFFF" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 20) / 13} width="28" height={20 / 13} fill="#B22234" />
      ))}
      <rect width="12" height={(20 / 13) * 7} fill="#3C3B6E" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <circle key={`${r}-${c}`} cx={1.8 + c * 2.8} cy={1.9 + r * 3.4} r="0.55" fill="#FFFFFF" />
        )),
      )}
    </svg>
  );
}

const OPTIONS: { lang: Lang; Flag: typeof FlagBR; code: string }[] = [
  { lang: "pt", Flag: FlagBR, code: "PT" },
  { lang: "en", Flag: FlagUS, code: "EN" },
];

export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      role="radiogroup"
      aria-label={t.langLabel}
      className="flex shrink-0 items-center gap-1 rounded border border-border bg-secondary/60 p-1"
    >
      {OPTIONS.map(({ lang: l, Flag, code }) => {
        const selected = lang === l;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={MESSAGES[l].langName}
            title={MESSAGES[l].langName}
            onClick={() => setLang(l)}
            className={cn(
              "flex items-center gap-1.5 rounded px-2 py-1 font-display text-xs font-bold tracking-widest transition-all",
              selected
                ? "bg-background text-gold ring-1 ring-gold-dim"
                : "text-muted-foreground opacity-60 hover:opacity-100",
            )}
          >
            <Flag className="h-3.5 w-5 rounded-[2px] ring-1 ring-foreground/20" />
            {code}
          </button>
        );
      })}
    </div>
  );
}
