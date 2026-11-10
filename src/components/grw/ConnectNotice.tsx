import { Link } from "@tanstack/react-router";
import { PlugZap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAgent } from "@/lib/agent/AgentProvider";

/** Shown when the panel is not talking to the local Windows agent. */
export function ConnectNotice() {
  const { connection, connectionError, hydrated, reconnect } = useAgent();
  if (!hydrated || connection === "connected") return null;
  const idle = connection === "idle";
  return (
    <div className="panel-frame mb-6 flex flex-col gap-3 border-warning/40 p-4 sm:flex-row sm:items-center">
      <PlugZap className="size-6 shrink-0 text-warning" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-foreground">
          {idle ? "Conecte o agente Windows para começar" : "Sem conexão com o agente Windows"}
        </p>
        <p className="text-muted-foreground">
          {idle
            ? "Instale e abra o agente no PC do jogo e cole o token em Configurações."
            : connectionError}
        </p>
      </div>
      <div className="flex gap-2">
        {idle ? (
          <>
            <Button asChild variant="frame" size="sm">
              <Link to="/instalacao">Como instalar</Link>
            </Button>
            <Button asChild variant="gold" size="sm">
              <Link to="/configuracoes">Conectar</Link>
            </Button>
          </>
        ) : (
          <>
            <Button variant="frame" size="sm" onClick={reconnect}>
              Tentar agora
            </Button>
            <Button asChild variant="gold" size="sm">
              <Link to="/configuracoes">Configurar</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
