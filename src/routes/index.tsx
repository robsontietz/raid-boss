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
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — Guardian Raid Watch" },
      {
        name: "description",
        content: "Estado em tempo real dos 11 Raid Bosses do Lineage 2 e alertas enviados ao Discord.",
      },
      { property: "og:title", content: "Painel — Guardian Raid Watch" },
      {
        property: "og:description",
        content: "Estado em tempo real dos 11 Raid Bosses do Lineage 2 e alertas enviados ao Discord.",
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
  const { t, lang } = useI18n();
  const d = t.dash;
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
      ? d.discordNotSet
      : discord.status === "ok"
        ? d.discordOk
        : discord.status === "error"
          ? d.discordError
          : d.discordSet;
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
          alt={d.bannerAlt}
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
            {d.tagline}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {active ? (
              <Button
                variant="ember"
                size="lg"
                disabled={!!busy}
                onClick={() => act("/api/monitor/stop", d.stopped)}
              >
                <Square /> {d.stop}
              </Button>
            ) : (
              <Button
                variant="gold"
                size="lg"
                disabled={!connected || !!busy}
                onClick={() => act("/api/monitor/start", d.started)}
              >
                <Play /> {d.start}
              </Button>
            )}
            <Button
              variant="frame"
              size="lg"
              disabled={!connected || !!busy}
              onClick={() => act("/api/monitor/run-now", d.refreshRequested)}
            >
              <RefreshCw className={busy === "/api/monitor/run-now" ? "animate-spin" : ""} /> {d.refresh}
            </Button>
          </div>
        </div>
      </section>

      <ConnectNotice />

      {needsSetup && (
        <div className="panel-frame mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <AlertTriangle className="size-6 shrink-0 text-warning" />
          <p className="flex-1 text-sm">
            <span className="font-semibold">{d.setupTitle}</span>{" "}
            <span className="text-muted-foreground">
              {d.setupBody}
            </span>
          </p>
          <Button asChild variant="gold" size="sm">
            <Link to="/calibracao">{d.openCalibration}</Link>
          </Button>
        </div>
      )}

      {connected && m?.last_error && (
        <div className="panel-frame mb-6 flex items-start gap-3 border-destructive/40 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-semibold text-destructive">{m.last_error}</p>
            <p className="text-muted-foreground">
              {fmtTime(m.last_error_at, lang)} · {d.errorNote}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        <StatusTile
          icon={Activity}
          label={d.monitoring}
          value={active ? d.active : d.stoppedValue}
          tone={active ? "success" : "danger"}
          hint={connected ? m?.status_text : "—"}
        />
        <StatusTile
          icon={MonitorSmartphone}
          label={d.agent}
          value={connected ? d.connected : d.offline}
          tone={connected ? "success" : "danger"}
          hint={
            connected
              ? snapshot?.window
                ? d.game(snapshot.window.width, snapshot.window.height)
                : d.gameNotFound
              : d.openBat
          }
        />
        <StatusTile
          icon={Bell}
          label="Discord"
          value={discordValue}
          tone={discordTone}
          hint={discord?.last_ok ? d.lastSent(fmtTime(discord.last_ok, lang)) : discord?.last_error ?? undefined}
        />
        <StatusTile
          icon={Clock}
          label={d.lastUpdate}
          value={<span className="data-mono text-xl">{fmtTime(m?.last_update, lang)}</span>}
          hint={fmtAgo(m?.last_update, lang) || d.noReadings}
        />
        <StatusTile
          icon={Hourglass}
          label={d.nextIn}
          value={<span className="data-mono text-xl">{active ? fmtCountdown(m?.next_update_at, now, lang) : "—"}</span>}
          hint={m ? d.every(m.interval_seconds) : undefined}
          tone="gold"
        />
        <StatusTile
          icon={Users}
          label={d.bosses}
          value={snapshot?.monitored_count ?? 11}
          hint={m && m.list_ok !== null ? d.rowsRead(m.valid_rows, m.rows) : d.monitored}
        />
        <StatusTile
          icon={Swords}
          label={d.changes}
          value={snapshot?.changes_count ?? 0}
          tone="gold"
          hint={d.detected}
        />
      </div>

      <Panel
        className="mt-6"
        title="Raid Bosses"
        description={d.bossesDesc}
      >
        <BossTable bosses={snapshot?.bosses} />
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title={d.latest}
          actions={
            <Button asChild variant="frame" size="sm">
              <Link to="/historico">{d.viewHistory}</Link>
            </Button>
          }
        >
          <EventTable events={events.slice(0, 6)} />
        </Panel>
        <Panel title={d.log} description={d.logDesc}>
          <div className="data-mono max-h-80 space-y-1.5 overflow-y-auto text-xs">
            {(snapshot?.logs ?? []).length === 0 && (
              <p className="text-muted-foreground">{d.noLogs}</p>
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
                <span className="text-gold-dim">{fmtTime(l.at, lang)}</span> {l.message}
              </p>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
