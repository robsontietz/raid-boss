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
      toast.success("Configurações salvas no agente");
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
        eyebrow="Ajustes"
        title="Configurações"
        description="Tudo fica salvo no arquivo de configuração do agente, no seu computador."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Conexão com o agente"
          description="O agente roda no PC do jogo e só aceita conexões deste mesmo computador."
        >
          <div className="space-y-4">
            <Field label="Endereço do agente" hint="Padrão: http://127.0.0.1:8765">
              <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
            </Field>
            <Field label="Token de acesso" hint="Aparece na janela do agente ao abrir o iniciar.bat.">
              <Input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Cole o token aqui"
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="gold"
                onClick={() => setCredentials(urlInput, tokenInput)}
                disabled={!tokenInput.trim()}
              >
                <Plug /> Conectar
              </Button>
              <span className="inline-flex items-center gap-2 text-sm">
                <PulseDot tone={connection === "idle" ? "muted" : connTone} />
                {connection === "connected"
                  ? "Conectado"
                  : connection === "idle"
                    ? "Não configurado"
                    : connection === "connecting"
                      ? "Conectando…"
                      : connectionError}
              </span>
            </div>
            {connection === "offline" && (
              <p className="text-xs text-muted-foreground">
                Dica: abra este painel no navegador do mesmo PC em que o agente está rodando. Se o
                navegador perguntar sobre acesso à rede local, clique em Permitir.
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Discord" description="As notificações são enviadas pelo agente, via Webhook.">
          {!cfg ? (
            <Waiting connected={connected} />
          ) : (
            <div className="space-y-4">
              <Field
                label="URL do Webhook"
                hint={
                  cfg.discord.webhook_set
                    ? `Salvo: ${cfg.discord.webhook_masked}. Cole uma nova URL para trocar.`
                    : "Discord > Configurações do canal > Integrações > Webhooks > Copiar URL."
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
                label="Enviar notificações"
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
                  <Save /> Salvar
                </Button>
                <Button
                  variant="frame"
                  disabled={!!testing || !cfg.discord.webhook_set}
                  onClick={() => runTest("discord", "/api/test/discord")}
                >
                  {testing === "discord" ? <Loader2 className="animate-spin" /> : <Bell />} Testar Discord
                </Button>
              </div>
              {test?.kind === "discord" && <TestResultView result={test.result} />}
            </div>
          )}
        </Panel>

        <Panel title="Ciclo de atualização" description="Como e quando o agente clica no botão RAID.">
          {!cfg ? (
            <Waiting connected={connected} />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Intervalo (s)" hint="Entre atualizações">
                  <Input
                    type="number"
                    min={5}
                    value={cfg.monitor.interval_seconds}
                    onChange={(e) => upd("monitor", { interval_seconds: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Entre os 2 cliques (ms)">
                  <Input
                    type="number"
                    min={50}
                    value={cfg.monitor.click_delay_ms}
                    onChange={(e) => upd("monitor", { click_delay_ms: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Espera após clicar (ms)" hint="Antes de capturar">
                  <Input
                    type="number"
                    min={100}
                    value={cfg.monitor.after_click_wait_ms}
                    onChange={(e) => upd("monitor", { after_click_wait_ms: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <Field label="Modo de clique">
                <Select
                  value={cfg.monitor.click_mode}
                  onValueChange={(v) => upd("monitor", { click_mode: v as "mouse" | "background" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mouse">Mouse (mais compatível, move o cursor rapidamente)</SelectItem>
                    <SelectItem value="background">Segundo plano (não move o cursor; nem todo cliente aceita)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <SwitchRow
                label="Devolver o cursor ao lugar"
                hint="Depois dos cliques, o mouse volta para onde estava."
                checked={cfg.monitor.restore_mouse}
                onChange={(v) => upd("monitor", { restore_mouse: v })}
              />
              <SwitchRow
                label="Trazer o jogo para frente antes de clicar"
                hint="Desligado: se outra janela estiver na frente, o ciclo espera em vez de clicar."
                checked={cfg.window.bring_to_front}
                onChange={(v) => upd("window", { bring_to_front: v })}
              />
              <SwitchRow
                label="Iniciar monitoramento ao abrir o agente"
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
                <Save /> Salvar
              </Button>
            </div>
          )}
        </Panel>

        <Panel title="Detecção de cores" description="Evita confundir brilho e sombras com mudança real.">
          {!cfg ? (
            <Waiting connected={connected} />
          ) : (
            <div className="space-y-5">
              <Field
                label={`Sensibilidade: ${cfg.monitor.sensitivity}/10`}
                hint="Mais alto percebe diferenças de tom menores. Padrão 5."
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
                <Field label="Leituras para confirmar" hint="Leituras iguais seguidas antes de notificar.">
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={cfg.monitor.confirm_reads}
                    onChange={(e) => upd("monitor", { confirm_reads: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Linhas mínimas reconhecidas (%)" hint="Abaixo disso a lista é considerada não visível.">
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
                label={`Rigor ao reconhecer os nomes: ${Math.round(cfg.monitor.row_match_threshold * 100)}%`}
                hint="Semelhança mínima com a referência para aceitar uma linha. Padrão 65%."
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
                <p className="mb-2 text-sm font-semibold">Nome do estado para cada cor</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {COLOR_BUCKETS.map((b) => (
                    <div key={b.key} className="space-y-1">
                      <span className="text-xs text-muted-foreground">{b.label}</span>
                      <Input
                        value={cfg.state_labels[b.key] ?? ""}
                        placeholder={b.key === "gray" ? "Cinza" : `Outra cor (${b.label})`}
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
                  Em branco: o painel mostra apenas a cor detectada, sem presumir o significado.
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
                <Save /> Salvar
              </Button>
            </div>
          )}
        </Panel>

        <Panel title="Janela do Lineage 2" description="Como o agente encontra o jogo.">
          {!cfg ? (
            <Waiting connected={connected} />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Parte do título da janela">
                  <Input
                    value={cfg.window.title_contains}
                    onChange={(e) => upd("window", { title_contains: e.target.value })}
                  />
                </Field>
                <Field label="Processo do jogo" hint="Evita confundir com abas do navegador.">
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
                  <Save /> Salvar
                </Button>
                <Button variant="frame" onClick={listWindows}>
                  <ListTree /> Listar janelas abertas
                </Button>
              </div>
              {windows && (
                <div className="max-h-60 overflow-y-auto rounded border border-border">
                  {windows.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">Nenhuma janela encontrada.</p>
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
          title="Testes"
          description="O jogo vem para frente durante o teste."
          actions={
            <Button asChild variant="frame" size="sm">
              <Link to="/calibracao">
                <Crosshair /> Calibração
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
              {testing === "capture" ? <Loader2 className="animate-spin" /> : <Camera />} Testar captura
            </Button>
            <Button
              variant="frame"
              disabled={!connected || !!testing}
              onClick={() => runTest("clicks", "/api/test/clicks")}
            >
              {testing === "clicks" ? <Loader2 className="animate-spin" /> : <MousePointerClick />} Testar 2
              cliques no RAID
            </Button>
          </div>
          {test && test.kind !== "discord" && <TestResultView result={test.result} />}
        </Panel>
      </div>
    </>
  );
}

function Waiting({ connected }: { connected: boolean }) {
  return (
    <p className="py-6 text-sm text-muted-foreground">
      {connected ? "Carregando configurações do agente…" : "Conecte o agente para editar."}
    </p>
  );
}
