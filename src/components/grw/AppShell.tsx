import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import type { ReactNode } from "react";

import { useAgent } from "@/lib/agent/AgentProvider";
import { PulseDot } from "./badges";

const NAV = [
  { to: "/", label: "Painel" },
  { to: "/historico", label: "Histórico" },
  { to: "/calibracao", label: "Calibração" },
  { to: "/configuracoes", label: "Configurações" },
  { to: "/instalacao", label: "Instalação" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { connection } = useAgent();
  const tone =
    connection === "connected"
      ? "success"
      : connection === "connecting"
        ? "warning"
        : connection === "idle"
          ? "muted"
          : "danger";
  const label =
    connection === "connected"
      ? "Agente conectado"
      : connection === "connecting"
        ? "Conectando…"
        : connection === "unauthorized"
          ? "Token inválido"
          : connection === "idle"
            ? "Agente não configurado"
            : "Agente offline";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded border border-gold-dim/70 bg-secondary">
              <Shield className="size-5 text-gold" />
            </span>
            <span className="hidden font-display text-sm font-bold leading-tight tracking-[0.18em] sm:block">
              <span className="text-gold-gradient">GUARDIAN</span>
              <br />
              <span className="text-muted-foreground">RAID WATCH</span>
            </span>
          </Link>
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="whitespace-nowrap rounded px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "bg-secondary text-gold" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link
            to="/configuracoes"
            className="hidden shrink-0 items-center gap-2 rounded border border-border bg-secondary/60 px-3 py-1.5 text-sm md:flex"
          >
            <PulseDot tone={tone} />
            {label}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-16">{children}</main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 py-8 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel-frame p-5 ${className ?? ""}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-semibold text-gold">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
