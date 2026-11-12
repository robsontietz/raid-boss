import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Camera, Crosshair, ListTree, Loader2, MousePointerClick, Plug, Save } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/grw/AppShell";
import { PulseDot } from "@/components/grw/badges";
import { TestResultView } from "@/components/grw/TestResultView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useAgent } from "@/lib/agent/AgentProvider";
import type { AgentConfig, TestResult } from "@/lib/agent/types";
import { COLOR_BUCKETS, DEFAULT_AGENT_URL } from "@/lib/bosses";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Guardian Raid Watch" },
      {
        name: "description",
        content: "Conexão com o agente, Webhook do Discord, intervalos, sensibilidade e testes.",
      },
      { property: "og:title", content: "Configurações — Guardian Raid Watch" },
      {
        property: "og:description",
        content: "Conexão com o agente, Webhook do Discord, intervalos, sensibilidade e testes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded border border-border/60 bg-background/40 p-3">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function SettingsPage() {
  const { agentUrl, token, setCredentials, connection, connectionError, call, hydrated } = useAgent();
  const connected = connection === "connected";
  const { t } = useI18n();
  const st = t.settings;

  const [urlInput, setUrlInput] = useState(DEFAULT_AGENT_URL);
  const [tokenInput, setTokenInput] = useState("");
  useEffect(() => {
    if (hydrated) {
      setUrlInput(agentUrl);
      setTokenInput(token);
    }
  }, [hydrated, agentUrl, token]);

  const [cfg, setCfg] = useState<AgentConfig | null>(null);
  const [webhook, setWebhook] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [test, setTest] = useState<{ kind: string; result: TestResult } | null>(null);
  const [windows, setWindows] = useState<{ title: string; process: string }[] | null>(null);

  useEffect(() => {
    if (!connected) return;
    call<AgentConfig>("/api/config")
      .then(setCfg)
      .catch((e) => toast.error((e as Error).message));
  }, [connected, call]);

  async function save(section: string, patch: Partial<Record<string, unknown>>) {
    setSaving(section);
    try {
      const res = await call<{ config: AgentConfig }>("/api/config", { method: "PUT", body: patch });
      setCfg(res.config);
      toast.success(st.saved);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setSaving(null);
    }
  }

  async function runTest(kind: string, path: string) {
    setTesting(kind);
    setTest(null);
    try {
      const result = await call<TestResult>(path, { method: "POST" });
      setTest({ kind, result });
    } catch (e) {
      setTest({ kind, result: { ok: false, message: (e as Error).message } });
    } finally {
      setTesting(null);
    }
  }

  async function listWindows() {
    try {
      setWindows(await call("/api/windows"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const upd = <K extends keyof AgentConfig>(key: K, value: Partial<AgentConfig[K]>) =>
    setCfg((c) => (c ? { ...c, [key]: { ...(c[key] as object), ...(value as object) } } : c));

  const connTone =
    connection === "connected" ? "success" : connection === "connecting" ? "warning" : "danger";

  return (
    <>
      <PageHeader
        eyebrow={st.eyebrow}
        title={st.title}
        description={st.desc}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title={st.connTitle}
          description={st.connDesc}
        >
          <div className="space-y-4">
            <Field label={st.address} hint={st.addressHint}>
              <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
            </Field>
            <Field label={st.token} hint={st.tokenHint}>
              <Input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={st.tokenPlaceholder}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="gold"
                onClick={() => setCredentials(urlInput, tokenInput)}
                disabled={!tokenInput.trim()}
              >
                <Plug /> {st.connect}
              </Button>
              <span className="inline-flex items-center gap-2 text-sm">
                <PulseDot tone={connection === "idle" ? "muted" : connTone} />
                {connection === "connected"
                  ? t.conn.connectedShort
                  : connection === "idle"
                    ? t.conn.idleShort
                    : connection === "connecting"
                      ? t.conn.connecting
                      : connectionError}
              </span>
            </div>
            {connection === "offline" && (
              <p className="text-xs text-muted-foreground">
                {st.offlineTip}
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Discord" description={st.discordDesc}>
          {!cfg ? (
            <Waiting connected={connected} />
          ) : (
            <div className="space-y-4">
              <Field
                label={st.webhook}
                hint={
                  cfg.discord.webhook_set
                    ? st.webhookSaved(cfg.discord.webhook_masked)
                    : st.webhookHint
                }
              >
                <Input
                  type="password"
                  value={webhook}
                  onChange={(e) => setWebhook(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/…"
                />
              </Field>
              <SwitchRow
                label={st.sendNotifications}
                checked={cfg.discord.enabled}
                onChange={(v) => upd("discord", { enabled: v })}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="gold"
                  disabled={saving === "discord"}
                  onClick={async () => {
                    const patch: Record<string, unknown> = { enabled: cfg.discord.enabled };
                    if (webhook.trim()) patch["webhook_url"] = webhook.trim();
                    if (await save("discord", { discord: patch })) setWebhook("");
                  }}
                >
                  <Save /> {st.save}
                </Button>
                <Button
                  variant="frame"
                  disabled={!!testing || !cfg.discord.webhook_set}
                  onClick={() => runTest("discord", "/api/test/discord")}
                >
                  {testing === "discord" ? <Loader2 className="animate-spin" /> : <Bell />} {st.testDiscord}
                </Button>
              </div>
              {test?.kind === "discord" && <TestResultView result={test.result} />}
            </div>
          )}
        </Panel>

        <Panel title={st.cycleTitle} description={st.cycleDesc}>
          {!cfg ? (
            <Waiting connected={connected} />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={st.interval} hint={st.intervalHint}>
                  <Input
                    type="number"
                    min={5}
                    value={cfg.monitor.interval_seconds}
                    onChange={(e) => upd("monitor", { interval_seconds: Number(e.target.value) })}
                  />
                </Field>
                <Field label={st.clickDelay}>
                  <Input
                    type="number"
                    min={50}
                    value={cfg.monitor.click_delay_ms}
                    onChange={(e) => upd("monitor", { click_delay_ms: Number(e.target.value) })}
                  />
                </Field>
                <Field label={st.afterWait} hint={st.afterWaitHint}>
                  <Input
                    type="number"
                    min={100}
                    value={cfg.monitor.after_click_wait_ms}
                    onChange={(e) => upd("monitor", { after_click_wait_ms: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <Field label={st.clickMode}>
                <Select
                  value={cfg.monitor.click_mode}
                  onValueChange={(v) => upd("monitor", { click_mode: v as "mouse" | "background" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mouse">{st.modeMouse}</SelectItem>
                    <SelectItem value="background">{st.modeBackground}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <SwitchRow
                label={st.restoreMouse}
                hint={st.restoreMouseHint}
                checked={cfg.monitor.restore_mouse}
                onChange={(v) => upd("monitor", { restore_mouse: v })}
              />
              <SwitchRow
                label={st.bringFront}
                hint={st.bringFrontHint}
                checked={cfg.window.bring_to_front}
                onChange={(v) => upd("window", { bring_to_front: v })}
              />
              <SwitchRow
                label={st.autoStart}
                checked={cfg.monitor.auto_start}
                onChange={(v) => upd("monitor", { auto_start: v })}
              />
              <Button
                variant="gold"
                disabled={saving === "cycle"}
                onClick={() =>
                  save("cycle", {
                    monitor: {
                      interval_seconds: cfg.monitor.interval_seconds,
                      click_delay_ms: cfg.monitor.click_delay_ms,
                      after_click_wait_ms: cfg.monitor.after_click_wait_ms,
                      click_mode: cfg.monitor.click_mode,
                      restore_mouse: cfg.monitor.restore_mouse,
                      auto_start: cfg.monitor.auto_start,
                    },
                    window: { bring_to_front: cfg.window.bring_to_front },
                  })
                }
              >
                <Save /> {st.save}
              </Button>
            </div>
          )}
        </Panel>

        <Panel title={st.detectTitle} description={st.detectDesc}>
          {!cfg ? (
            <Waiting connected={connected} />
          ) : (
            <div className="space-y-5">
              <Field
                label={st.sensitivity(cfg.monitor.sensitivity)}
                hint={st.sensitivityHint}
              >
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[cfg.monitor.sensitivity]}
                  onValueChange={([v]) => upd("monitor", { sensitivity: v ?? 5 })}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={st.confirmReads} hint={st.confirmReadsHint}>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={cfg.monitor.confirm_reads}
                    onChange={(e) => upd("monitor", { confirm_reads: Number(e.target.value) })}
                  />
                </Field>
                <Field label={st.minRows} hint={st.minRowsHint}>
                  <Input
                    type="number"
                    min={10}
                    max={100}
                    value={cfg.monitor.min_valid_rows_pct}
                    onChange={(e) => upd("monitor", { min_valid_rows_pct: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <Field
                label={st.rigor(Math.round(cfg.monitor.row_match_threshold * 100))}
                hint={st.rigorHint}
              >
                <Slider
                  min={30}
                  max={90}
                  step={5}
                  value={[Math.round(cfg.monitor.row_match_threshold * 100)]}
                  onValueChange={([v]) => upd("monitor", { row_match_threshold: (v ?? 65) / 100 })}
                />
              </Field>
              <div>
                <p className="mb-2 text-sm font-semibold">{st.stateNames}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {COLOR_BUCKETS.map((b) => (
                    <div key={b.key} className="space-y-1">
                      <span className="text-xs text-muted-foreground">{t.colors[b.key] ?? b.label}</span>
                      <Input
                        value={cfg.state_labels[b.key] ?? ""}
                        placeholder={b.key === "gray" ? t.colors["gray"] : t.otherColor(t.colors[b.key] ?? b.label)}
                        onChange={(e) =>
                          setCfg((c) =>
                            c ? { ...c, state_labels: { ...c.state_labels, [b.key]: e.target.value } } : c,
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {st.stateNamesHint}
                </p>
              </div>
              <Button
                variant="gold"
                disabled={saving === "detect"}
                onClick={() =>
                  save("detect", {
                    monitor: {
                      sensitivity: cfg.monitor.sensitivity,
                      confirm_reads: cfg.monitor.confirm_reads,
                      min_valid_rows_pct: cfg.monitor.min_valid_rows_pct,
                      row_match_threshold: cfg.monitor.row_match_threshold,
                    },
                    state_labels: cfg.state_labels,
                  })
                }
              >
                <Save /> {st.save}
              </Button>
            </div>
          )}
        </Panel>

        <Panel title={st.windowTitle} description={st.windowDesc}>
          {!cfg ? (
            <Waiting connected={connected} />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={st.titleContains}>
                  <Input
                    value={cfg.window.title_contains}
                    onChange={(e) => upd("window", { title_contains: e.target.value })}
                  />
                </Field>
                <Field label={st.process} hint={st.processHint}>
                  <Input
                    value={cfg.window.process_name}
                    placeholder="L2.exe"
                    onChange={(e) => upd("window", { process_name: e.target.value })}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="gold"
                  disabled={saving === "window"}
                  onClick={() =>
                    save("window", {
                      window: {
                        title_contains: cfg.window.title_contains,
                        process_name: cfg.window.process_name,
                      },
                    })
                  }
                >
                  <Save /> {st.save}
                </Button>
                <Button variant="frame" onClick={listWindows}>
                  <ListTree /> {st.listWindows}
                </Button>
              </div>
              {windows && (
                <div className="max-h-60 overflow-y-auto rounded border border-border">
                  {windows.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">{st.noWindows}</p>
                  )}
                  {windows.map((w, i) => (
                    <button
                      key={`${w.title}-${i}`}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-border/50 px-3 py-2 text-left text-sm hover:bg-secondary"
                      onClick={() => upd("window", { title_contains: w.title, process_name: w.process })}
                    >
                      <span className="truncate">{w.title}</span>
                      <span className="data-mono shrink-0 text-xs text-muted-foreground">{w.process}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Panel>

        <Panel
          title={st.testsTitle}
          description={st.testsDesc}
          actions={
            <Button asChild variant="frame" size="sm">
              <Link to="/calibracao">
                <Crosshair /> {st.calibration}
              </Link>
            </Button>
          }
        >
          <div className="flex flex-wrap gap-2">
            <Button
              variant="frame"
              disabled={!connected || !!testing}
              onClick={() => runTest("capture", "/api/test/capture")}
            >
              {testing === "capture" ? <Loader2 className="animate-spin" /> : <Camera />} {st.testCapture}
            </Button>
            <Button
              variant="frame"
              disabled={!connected || !!testing}
              onClick={() => runTest("clicks", "/api/test/clicks")}
            >
              {testing === "clicks" ? <Loader2 className="animate-spin" /> : <MousePointerClick />} {st.testClicks}
            </Button>
          </div>
          {test && test.kind !== "discord" && <TestResultView result={test.result} />}
        </Panel>
      </div>
    </>
  );
}

function Waiting({ connected }: { connected: boolean }) {
  const { t } = useI18n();
  return (
    <p className="py-6 text-sm text-muted-foreground">
      {connected ? t.settings.loading : t.settings.connectToEdit}
    </p>
  );
}
