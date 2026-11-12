import { CheckCircle2, XCircle } from "lucide-react";

import type { TestResult } from "@/lib/agent/types";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { colorName, localizeState } from "@/lib/i18n/messages";
import { ColorSwatch } from "./badges";

export function TestResultView({ result }: { result: TestResult }) {
  const { t, lang } = useI18n();
  return (
    <div className="mt-4 space-y-3 rounded border border-border bg-background/60 p-4">
      <p
        className={`flex items-start gap-2 text-sm font-semibold ${result.ok ? "text-success" : "text-destructive"}`}
      >
        {result.ok ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        ) : (
          <XCircle className="mt-0.5 size-4 shrink-0" />
        )}
        {result.message}
      </p>
      {result.image && (
        <img
          src={result.image}
          alt={t.testResult.imageAlt}
          className="max-h-[480px] w-auto max-w-full rounded border border-border"
        />
      )}
      {result.rows && result.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
                <th className="px-2 py-1.5">{t.testResult.row}</th>
                <th className="px-2 py-1.5">{t.testResult.expected}</th>
                <th className="px-2 py-1.5">{t.testResult.colorRead}</th>
                <th className="px-2 py-1.5">{t.testResult.state}</th>
                <th className="px-2 py-1.5">{t.testResult.shape}</th>
                <th className="px-2 py-1.5">{t.testResult.status}</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.row} className="border-b border-border/40">
                  <td className="data-mono px-2 py-1.5 text-muted-foreground">{r.row}</td>
                  <td className="px-2 py-1.5">
                    {r.boss_name ?? "—"}
                    {r.ocr_text != null && (
                      <span className="block text-xs text-muted-foreground">
                        OCR: “{r.ocr_text}”
                        {r.ocr_match != null && ` (${Math.round(r.ocr_match * 100)}%)`}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="inline-flex items-center gap-2">
                      <ColorSwatch hex={r.hex} />
                      {colorName(r.bucket, lang, r.color_name) ?? "—"}
                      {r.hex && <span className="data-mono text-xs text-muted-foreground">{r.hex}</span>}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">{localizeState(r.state, lang) ?? "—"}</td>
                  <td className="data-mono px-2 py-1.5 text-xs text-muted-foreground">
                    {r.match != null ? `${Math.round(r.match * 100)}%` : "—"}
                  </td>
                  <td className={`px-2 py-1.5 text-xs ${r.valid ? "text-success" : "text-destructive"}`}>
                    {r.valid ? "OK" : r.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
