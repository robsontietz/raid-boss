import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/grw/AppShell";
import { ConnectNotice } from "@/components/grw/ConnectNotice";
import { EventTable } from "@/components/grw/EventTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAgent } from "@/lib/agent/AgentProvider";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de eventos — Guardian Raid Watch" },
      {
        name: "description",
        content: "Todas as mudanças de estado dos Raid Bosses e o status do envio ao Discord.",
      },
      { property: "og:title", content: "Histórico de eventos — Guardian Raid Watch" },
      {
        property: "og:description",
        content: "Todas as mudanças de estado dos Raid Bosses e o status do envio ao Discord.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { events, call, connection } = useAgent();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? events.filter((e) => e.boss_name.toLowerCase().includes(s)) : events;
  }, [events, q]);

  async function clear() {
    if (!confirm("Apagar todo o histórico de eventos?")) return;
    try {
      await call("/api/events", { method: "DELETE" });
      toast.success("Histórico apagado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Registro"
        title="Histórico de eventos"
        description="Cada linha é uma mudança de cor confirmada, com o resultado do envio ao Discord."
        actions={
          <Button variant="frame" onClick={clear} disabled={connection !== "connected" || !events.length}>
            <Trash2 /> Limpar histórico
          </Button>
        }
      />
      <ConnectNotice />
      <Panel
        actions={
          <Input
            placeholder="Filtrar por boss…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-64"
          />
        }
        title={`${filtered.length} ${filtered.length === 1 ? "evento" : "eventos"}`}
      >
        <EventTable events={filtered} empty={q ? "Nenhum evento para esse boss." : undefined} />
      </Panel>
    </>
  );
}
