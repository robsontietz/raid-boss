import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, ShieldCheck } from "lucide-react";

import { PageHeader, Panel } from "@/components/grw/AppShell";
import { Button } from "@/components/ui/button";
import { AGENT_ZIP_PATH } from "@/lib/bosses";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/instalacao")({
  head: () => ({
    meta: [
      { title: "Instalação do agente — Guardian Raid Watch" },
      {
        name: "description",
        content: "Baixe e instale o agente Windows que monitora a lista RAID do Lineage 2.",
      },
      { property: "og:title", content: "Instalação do agente — Guardian Raid Watch" },
      {
        property: "og:description",
        content: "Baixe e instale o agente Windows que monitora a lista RAID do Lineage 2.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InstallPage,
});

function InstallPage() {
  const { t } = useI18n();
  const i = t.install;
  return (
    <>
      <PageHeader
        eyebrow={i.eyebrow}
        title={i.title}
        description={i.desc}
        actions={
          <Button asChild variant="gold" size="lg">
            <a href={AGENT_ZIP_PATH} download>
              <Download /> {i.download}
            </a>
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel title={i.stepsTitle}>
          <ol className="space-y-4">
            {i.steps.map((s, n) => (
              <li key={n} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded border border-gold-dim/60 bg-secondary font-display font-bold text-gold">
                  {n + 1}
                </span>
                <div>
                  <p className="font-semibold text-foreground">{s.title}</p>
                  <p className="text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild variant="frame">
              <Link to="/configuracoes">{i.goSettings}</Link>
            </Button>
            <Button asChild variant="frame">
              <Link to="/calibracao">{i.goCalibration}</Link>
            </Button>
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title={i.securityTitle}>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {i.security.map((line) => (
                <li key={line} className="flex gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                  {line}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title={i.tipsTitle}>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {i.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
