import { createFileRoute } from "@tanstack/react-router";
import { Camera, Crosshair, Loader2, RotateCcw, Save, ScanLine, SquareDashed } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/grw/AppShell";
import { ConnectNotice } from "@/components/grw/ConnectNotice";
import { TestResultView } from "@/components/grw/TestResultView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAgent } from "@/lib/agent/AgentProvider";
import type { AgentConfig, TestResult } from "@/lib/agent/types";

export const Route = createFileRoute("/calibracao")({
  head: () => ({
    meta: [
      { title: "Calibração — Guardian Raid Watch" },
      {
        name: "description",
        content: "Assistente visual para marcar o botão RAID e a área da lista de Raid Bosses.",
      },
      { property: "og:title", content: "Calibração — Guardian Raid Watch" },
      {
        property: "og:description",
        content: "Assistente visual para marcar o botão RAID e a área da lista de Raid Bosses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalibrationPage,
});

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type Shot = { image: string; width: number; height: number; calibration: AgentConfig["calibration"] };

function CalibrationPage() {
  const { call, connection } = useAgent();
  const connected = connection === "connected";
  const [shot, setShot] = useState<Shot | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [mode, setMode] = useState<"raid" | "list">("raid");
  const [raid, setRaid] = useState<Point | null>(null);
  const [region, setRegion] = useState<Rect | null>(null);
  const [rows, setRows] = useState(20);
  const [drag, setDrag] = useState<Point | null>(null);
  const [refResult, setRefResult] = useState<TestResult | null>(null);
  const [cfg, setCfg] = useState<AgentConfig | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!connected) return;
    call<AgentConfig>("/api/config")
      .then((c) => {
        setCfg(c);
        setRaid(c.calibration.raid_button);
        setRegion(c.calibration.list_region);
        setRows(c.calibration.rows || 20);
      })
      .catch((e) => toast.error((e as Error).message));
  }, [connected, call]);

  async function capture() {
    setLoading("shot");
    try {
      const s = await call<Shot>("/api/calibration/screenshot", { method: "POST" });
      setShot(s);
      toast.success(`Tela capturada (${s.width}×${s.height})`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  function toImage(e: PointerEvent<HTMLDivElement>): Point | null {
    const el = boxRef.current;
    if (!el || !shot) return null;
    const r = el.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * shot.width);
    const y = Math.round(((e.clientY - r.top) / r.height) * shot.height);
    return { x: Math.max(0, Math.min(shot.width - 1, x)), y: Math.max(0, Math.min(shot.height - 1, y)) };
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    const p = toImage(e);
    if (!p) return;
    if (mode === "raid") {
      setRaid(p);
      setMode("list");
      return;
    }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag(p);
    setRegion({ x: p.x, y: p.y, w: 0, h: 0 });
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag || mode !== "list") return;
    const p = toImage(e);
    if (!p) return;
    setRegion({
      x: Math.min(drag.x, p.x),
      y: Math.min(drag.y, p.y),
      w: Math.abs(p.x - drag.x),
      h: Math.abs(p.y - drag.y),
    });
  }
  function onUp() {
    setDrag(null);
  }

  async function saveCalibration() {
    if (!raid || !region) return;
    setLoading("save");
    try {
      await call("/api/calibration/save", {
        method: "POST",
        body: { raid_button: raid, list_region: region, rows },
      });
      toast.success("Calibração salva. Agora capture a referência da lista.");
      setRefResult(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  async function captureReference() {
    setLoading("ref");
    try {
      const r = await call<TestResult>("/api/calibration/reference", { method: "POST", body: { click: true } });
      setRefResult(r);
      if (r.ok) toast.success("Referência salva");
      else toast.error(r.message);
    } catch (e) {
      setRefResult({ ok: false, message: (e as Error).message });
    } finally {
      setLoading(null);
    }
  }

  async function saveMapping() {
    if (!cfg) return;
    setLoading("map");
    try {
      const res = await call<{ config: AgentConfig }>("/api/config", {
        method: "PUT",
        body: { bosses: cfg.bosses.map((b) => ({ id: b.id, row: b.row, enabled: b.enabled })) },
      });
      setCfg(res.config);
      toast.success("Ordem dos bosses salva");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  const rowNames = new Map((cfg?.bosses ?? []).map((b) => [b.row, b.name]));

  return (
    <>
      <PageHeader
        eyebrow="Assistente"
        title="Calibração"
        description="Mostre ao agente onde fica o botão RAID e onde aparecem os nomes dos 20 bosses."
      />
      <ConnectNotice />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Panel
          title="1. Tela do jogo"
          description="Deixe a lista RAID aberta no jogo e capture a tela. O jogo vem para frente por um instante."
          actions={
            <Button variant="gold" onClick={capture} disabled={!connected || !!loading}>
              {loading === "shot" ? <Loader2 className="animate-spin" /> : <Camera />} Capturar tela do jogo
            </Button>
          }
        >
          {!shot ? (
            <div className="grid min-h-72 place-items-center rounded border border-dashed border-border text-center text-muted-foreground">
              <div>
                <ScanLine className="mx-auto mb-2 size-8 text-gold-dim" />
                A captura do jogo aparecerá aqui.
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                <Button variant={mode === "raid" ? "gold" : "frame"} size="sm" onClick={() => setMode("raid")}>
                  <Crosshair /> 2. Clique no botão RAID
                </Button>
                <Button variant={mode === "list" ? "gold" : "frame"} size="sm" onClick={() => setMode("list")}>
                  <SquareDashed /> 3. Arraste sobre os nomes
                </Button>
              </div>
              <div className="overflow-auto rounded border border-border">
                <div
                  ref={boxRef}
                  className="relative w-full min-w-[640px] cursor-crosshair touch-none select-none"
                  onPointerDown={onDown}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                >
                  <img src={shot.image} alt="Tela do Lineage 2 capturada" className="block w-full" draggable={false} />
                  {raid && (
                    <div
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: pct(raid.x, shot.width), top: pct(raid.y, shot.height) }}
                    >
                      <div className="size-6 rounded-full border-2 border-ember bg-ember/30 glow-ember" />
                      <span className="absolute left-7 top-0 whitespace-nowrap rounded bg-background/90 px-1.5 text-xs font-bold text-ember">
                        RAID
                      </span>
                    </div>
                  )}
                  {region && region.w > 0 && region.h > 0 && (
                    <div
                      className="pointer-events-none absolute border-2 border-gold bg-gold/5"
                      style={{
                        left: pct(region.x, shot.width),
                        top: pct(region.y, shot.height),
                        width: pct(region.w, shot.width),
                        height: pct(region.h, shot.height),
                      }}
                    >
                      {Array.from({ length: rows }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute inset-x-0 border-t border-gold/40"
                          style={{ top: `${(i / rows) * 100}%`, height: `${100 / rows}%` }}
                        >
                          <span className="absolute -right-1 top-0 translate-x-full whitespace-nowrap bg-background/80 px-1 text-[10px] leading-tight text-gold">
                            {i + 1}. {rowNames.get(i + 1) ?? ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Cubra somente os nomes, do primeiro ao último boss. As linhas douradas devem cair em cima de cada nome.
              </p>
            </>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Ajustes">
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="eyebrow">Botão RAID</p>
                  <p className="data-mono">{raid ? `${raid.x}, ${raid.y}` : "—"}</p>
                </div>
                <div>
                  <p className="eyebrow">Área da lista</p>
                  <p className="data-mono">{region ? `${region.w}×${region.h}` : "—"}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Número de linhas na área</Label>
                <Input type="number" min={1} max={40} value={rows} onChange={(e) => setRows(Number(e.target.value) || 1)} />
              </div>
              <Button
                variant="gold"
                className="w-full"
                disabled={!connected || !raid || !region || region.w < 20 || region.h < 20 || !!loading}
                onClick={saveCalibration}
              >
                {loading === "save" ? <Loader2 className="animate-spin" /> : <Save />} Salvar calibração
              </Button>
              <div className="divider-ornament" />
              <p className="text-muted-foreground">
                4. Com a lista visível, capture a referência. O agente clica 2× no RAID, guarda o formato de cada nome e
                registra as cores atuais como ponto de partida (sem notificar).
              </p>
              <Button variant="frame" className="w-full" disabled={!connected || !!loading} onClick={captureReference}>
                {loading === "ref" ? <Loader2 className="animate-spin" /> : <ScanLine />} Capturar referência
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                disabled={!connected || !!loading}
                onClick={async () => {
                  try {
                    await call("/api/monitor/reset-states", { method: "POST" });
                    toast.success("Estados apagados; a próxima leitura será o novo ponto de partida.");
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                <RotateCcw /> Recomeçar estados dos bosses
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      {refResult && (
        <Panel className="mt-6" title="Resultado da referência">
          <TestResultView result={refResult} />
        </Panel>
      )}

      <Panel
        className="mt-6"
        title="Ordem dos bosses na lista"
        description="Linha de cada boss dentro da área marcada (1 = primeira linha). Desative os que não quiser monitorar."
        actions={
          <Button variant="gold" size="sm" disabled={!cfg || !!loading} onClick={saveMapping}>
            <Save /> Salvar ordem
          </Button>
        }
      >
        {!cfg ? (
          <p className="text-sm text-muted-foreground">Conecte o agente para editar.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {cfg.bosses.map((b, i) => (
              <div key={b.id} className="flex items-center gap-2 rounded border border-border/60 bg-background/40 p-2">
                <Input
                  type="number"
                  min={1}
                  max={rows}
                  value={b.row}
                  className="h-8 w-16"
                  onChange={(e) =>
                    setCfg((c) => {
                      if (!c) return c;
                      const bosses = c.bosses.slice();
                      bosses[i] = { ...b, row: Number(e.target.value) || 1 };
                      return { ...c, bosses };
                    })
                  }
                />
                <span className="flex-1 truncate text-sm">
                  {b.name} <span className="data-mono text-xs text-gold">Lv.{b.level}</span>
                </span>
                <Switch
                  checked={b.enabled}
                  onCheckedChange={(v) =>
                    setCfg((c) => {
                      if (!c) return c;
                      const bosses = c.bosses.slice();
                      bosses[i] = { ...b, enabled: v };
                      return { ...c, bosses };
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
