import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Bell,
  Clock,
  Hourglass,
  MonitorSmartphone,
  Play,
  RefreshCw,
  Square,
  Swords,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import banner from "@/assets/citadel-banner.jpg";
import { Panel } from "@/components/grw/AppShell";
import { BossTable } from "@/components/grw/BossTable";
import { ConnectNotice } from "@/components/grw/ConnectNotice";
import { EventTable } from "@/components/grw/EventTable";
import { StatusTile } from "@/components/grw/StatusTile";
import { Button } from "@/components/ui/button";
import { useAgent, useNow } from "@/lib/agent/AgentProvider";
import { fmtAgo, fmtCountdown, fmtTime } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — Guardian Raid Watch" },
      {
        name: "description",
        content: "Estado em tempo real dos 20 Raid Bosses do Lineage 2 e alertas enviados ao Discord.",
      },
      { property: "og:title", content: "Painel — Guardian Raid Watch" },
      {
        property: "og:description",
        content: "Estado em tempo real dos 20 Raid Bosses do Lineage 2 e alertas enviados ao Discord.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { snapshot, events, connection, call } = useAgent();
  const now = useNow(1000);
  const [busy, setBusy] = useState<string | null>(null);
  const connected = connection === "connected";
  const m = snapshot?.monitoring;
  const active = !!m?.active && connected;

  async function act(path: string, label: string) {
    setBusy(path);
    try {
      await call(path, { method: "POST" });
      toast.success(label);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const discord = snapshot?.discord;
  const discordValue = !connected
    ? "—"
    : !discord?.configured
      ? "Não configurado"
      : discord.status === "ok"
        ? "Conectado"
        : discord.status === "error"
          ? "Com erro"
          : "Configurado";
  const discordTone =
    !connected || !discord?.configured
      ? "warning"
      : discord.status === "ok"
        ? "success"
        : discord.status === "error"
          ? "danger"
          : "gold";

  const needsSetup =
    connected && snapshot && (!snapshot.calibration.calibrated || !snapshot.calibration.reference_ready);

  return (
    <>
      <section className="relative -mx-4 mb-8 overflow-hidden border-b border-border">
        <img
          src={banner}
          alt="Cidadela sombria sob a lua vermelha"
          width={1920}
          height={640}
          className="absolute inset-0 h-full w-full object-cover object-right"
        />
        <div className="banner-fade absolute inset-0" />
        <div className="banner-fade-bottom absolute inset-0" />
        <div className="relative px-4 py-12 md:py-16">
          <p className="eyebrow">Lineage II · Raid Boss Monitor</p>
          <h1 className="mt-2 text-4xl font-extrabold md:text-6xl">
            <span className="text-gold-gradient">GUARDIAN</span>{" "}
            <span className="text-foreground">RAID WATCH</span>
          </h1>
          <p className="mt-3 max-w-xl text-lg text-muted-foreground">
            Vigia a lista RAID enquanto você joga e avisa no Discord quando qualquer boss muda de cor.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {active ? (
              <Button
                variant="ember"
                size="lg"
                disabled={!!busy}
                onClick={() => act("/api/monitor/stop", "Monitoramento interrompido")}
              >
                <Square /> Parar monitoramento
              </Button>
            ) : (
              <Button
                variant="gold"
                size="lg"
                disabled={!connected || !!busy}
                onClick={() => act("/api/monitor/start", "Monitoramento iniciado")}
              >
                <Play /> Iniciar monitoramento
              </Button>
            )}
            <Button
              variant="frame"
              size="lg"
              disabled={!connected || !!busy}
              onClick={() => act("/api/monitor/run-now", "Atualização da lista solicitada")}
            >
              <RefreshCw className={busy === "/api/monitor/run-now" ? "animate-spin" : ""} /> Atualizar agora
            </Button>
          </div>
        </div>
      </section>

      <ConnectNotice />

      {needsSetup && (
        <div className="panel-frame mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <AlertTriangle className="size-6 shrink-0 text-warning" />
          <p className="flex-1 text-sm">
            <span className="font-semibold">Falta calibrar.</span>{" "}
            <span className="text-muted-foreground">
              Marque o botão RAID, a área da lista e capture a referência antes de iniciar.
            </span>
          </p>
          <Button asChild variant="gold" size="sm">
            <Link to="/calibracao">Abrir calibração</Link>
          </Button>
        </div>
      )}

      {connected && m?.last_error && (
        <div className="panel-frame mb-6 flex items-start gap-3 border-destructive/40 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-semibold text-destructive">{m.last_error}</p>
            <p className="text-muted-foreground">
              {fmtTime(m.last_error_at)} · Nenhuma alteração é registrada enquanto o problema persistir.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        <StatusTile
          icon={Activity}
          label="Monitoramento"
          value={active ? "ATIVO" : "PARADO"}
          tone={active ? "success" : "danger"}
          hint={connected ? m?.status_text : "—"}
        />
        <StatusTile
          icon={MonitorSmartphone}
          label="Agente Windows"
          value={connected ? "Conectado" : "Offline"}
          tone={connected ? "success" : "danger"}
          hint={
            connected
              ? snapshot?.window
                ? `Jogo ${snapshot.window.width}×${snapshot.window.height}`
                : "Jogo não localizado"
              : "Abra o iniciar.bat"
          }
        />
        <StatusTile
          icon={Bell}
          label="Discord"
          value={discordValue}
          tone={discordTone}
          hint={discord?.last_ok ? `Último envio ${fmtTime(discord.last_ok)}` : discord?.last_error ?? undefined}
        />
        <StatusTile
          icon={Clock}
          label="Última atualização"
          value={<span className="data-mono text-xl">{fmtTime(m?.last_update)}</span>}
          hint={fmtAgo(m?.last_update) || "Sem leituras"}
        />
        <StatusTile
          icon={Hourglass}
          label="Próxima em"
          value={<span className="data-mono text-xl">{active ? fmtCountdown(m?.next_update_at, now) : "—"}</span>}
          hint={m ? `Intervalo de ${m.interval_seconds}s` : undefined}
          tone="gold"
        />
        <StatusTile
          icon={Users}
          label="Bosses"
          value={snapshot?.monitored_count ?? 20}
          hint={m && m.list_ok !== null ? `${m.valid_rows}/${m.rows} linhas lidas` : "monitorados"}
        />
        <StatusTile
          icon={Swords}
          label="Alterações"
          value={snapshot?.changes_count ?? 0}
          tone="gold"
          hint="detectadas"
        />
      </div>

      <Panel
        className="mt-6"
        title="Raid Bosses"
        description="Cinza = Standby · Vermelho = In Battle · outras cores aparecem como foram detectadas."
      >
        <BossTable bosses={snapshot?.bosses} />
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Últimas alterações"
          actions={
            <Button asChild variant="frame" size="sm">
              <Link to="/historico">Ver histórico</Link>
            </Button>
          }
        >
          <EventTable events={events.slice(0, 6)} />
        </Panel>
        <Panel title="Registro do agente" description="Erros de captura e comunicação aparecem aqui.">
          <div className="data-mono max-h-80 space-y-1.5 overflow-y-auto text-xs">
            {(snapshot?.logs ?? []).length === 0 && (
              <p className="text-muted-foreground">Sem registros.</p>
            )}
            {[...(snapshot?.logs ?? [])].reverse().map((l, i) => (
              <p
                key={`${l.at}-${i}`}
                className={
                  l.level === "error"
                    ? "text-destructive"
                    : l.level === "warning"
                      ? "text-warning"
                      : "text-muted-foreground"
                }
              >
                <span className="text-gold-dim">{fmtTime(l.at)}</span> {l.message}
              </p>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
