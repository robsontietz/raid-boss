import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, ShieldCheck } from "lucide-react";

import { PageHeader, Panel } from "@/components/grw/AppShell";
import { Button } from "@/components/ui/button";
import { AGENT_ZIP_PATH } from "@/lib/bosses";

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

const STEPS: { title: string; body: string }[] = [
  {
    title: "Instale o Python",
    body: "Baixe o Python 3.10 ou mais novo em python.org. Na instalação, marque “Add python.exe to PATH”.",
  },
  {
    title: "Baixe e extraia o agente",
    body: "Extraia o arquivo .zip em uma pasta fixa, por exemplo C:\\GuardianRaidWatch.",
  },
  {
    title: "Execute instalar.bat",
    body: "Dois cliques. Ele prepara tudo o que o agente precisa (só na primeira vez).",
  },
  {
    title: "Execute iniciar.bat",
    body: "Uma janela mostra o endereço e o token. Deixe-a aberta enquanto joga.",
  },
  {
    title: "Conecte o painel",
    body: "Abra este painel no navegador do mesmo PC, vá em Configurações e cole o token. Se o navegador pedir acesso à rede local, permita.",
  },
  {
    title: "Calibre e inicie",
    body: "Em Calibração marque o botão RAID e a área dos nomes, capture a referência, configure o Discord e clique em Iniciar monitoramento.",
  },
];

function InstallPage() {
  return (
    <>
      <PageHeader
        eyebrow="Windows 10 / 11"
        title="Instalação do agente"
        description="O agente roda no computador do jogo: clica no botão RAID, lê as cores e envia os alertas ao Discord."
        actions={
          <Button asChild variant="gold" size="lg">
            <a href={AGENT_ZIP_PATH} download>
              <Download /> Baixar agente (.zip)
            </a>
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel title="Passo a passo">
          <ol className="space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded border border-gold-dim/60 bg-secondary font-display font-bold text-gold">
                  {i + 1}
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
              <Link to="/configuracoes">Ir para Configurações</Link>
            </Button>
            <Button asChild variant="frame">
              <Link to="/calibracao">Ir para Calibração</Link>
            </Button>
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Segurança">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                O agente só aceita conexões do próprio computador; nada fica aberto na internet.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                Toda ação do painel exige o token de acesso.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                O Webhook do Discord fica salvo apenas no arquivo de configuração do agente.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                Sem leitura de memória e sem mexer nos arquivos do jogo: só captura de tela e cliques.
              </li>
            </ul>
          </Panel>
          <Panel title="Dicas">
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Use o jogo em modo janela ou tela cheia sem bordas.</li>
              <li>Não mude o tamanho da janela depois de calibrar (se mudar, recalibre).</li>
              <li>Se os cliques não funcionarem, abra o iniciar.bat como administrador.</li>
              <li>Abra o painel em uma aba própria do navegador no PC do jogo.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
