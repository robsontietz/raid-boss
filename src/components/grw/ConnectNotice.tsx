import { Link } from "@tanstack/react-router";
import { PlugZap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAgent } from "@/lib/agent/AgentProvider";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** Shown when the panel is not talking to the local Windows agent. */
export function ConnectNotice() {
  const { connection, connectionError, hydrated, reconnect } = useAgent();
  const { t } = useI18n();
  if (!hydrated || connection === "connected") return null;
  const idle = connection === "idle";
  return (
    <div className="panel-frame mb-6 flex flex-col gap-3 border-warning/40 p-4 sm:flex-row sm:items-center">
      <PlugZap className="size-6 shrink-0 text-warning" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-foreground">
          {idle ? t.connect.idleTitle : t.connect.offlineTitle}
        </p>
        <p className="text-muted-foreground">
          {idle
            ? t.connect.idleBody
            : connectionError}
        </p>
      </div>
      <div className="flex gap-2">
        {idle ? (
          <>
            <Button asChild variant="frame" size="sm">
              <Link to="/instalacao">{t.connect.howToInstall}</Link>
            </Button>
            <Button asChild variant="gold" size="sm">
              <Link to="/configuracoes">{t.connect.connect}</Link>
            </Button>
          </>
        ) : (
          <>
            <Button variant="frame" size="sm" onClick={reconnect}>
              {t.connect.tryNow}
            </Button>
            <Button asChild variant="gold" size="sm">
              <Link to="/configuracoes">{t.connect.configure}</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
