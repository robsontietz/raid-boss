import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { DEFAULT_AGENT_URL } from "@/lib/bosses";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { AgentSnapshot, ConnectionState, LogEntry, RaidEvent } from "./types";

const URL_KEY = "grw.agentUrl";
const TOKEN_KEY = "grw.agentToken";

export class AgentError extends Error {}

interface AgentContextValue {
  agentUrl: string;
  token: string;
  hydrated: boolean;
  connection: ConnectionState;
  connectionError: string | null;
  snapshot: AgentSnapshot | null;
  events: RaidEvent[];
  setCredentials: (url: string, token: string) => void;
  reconnect: () => void;
  call: <T = unknown>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;
}

type ConnErrorKey = "tokenRefused" | "notFound" | "lost";

const AgentContext = createContext<AgentContextValue | null>(null);

function normalizeUrl(url: string) {
  return (url || DEFAULT_AGENT_URL).trim().replace(/\/+$/, "");
}

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agentUrl, setAgentUrl] = useState(DEFAULT_AGENT_URL);
  const [token, setToken] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [connErrorKey, setConnectionError] = useState<ConnErrorKey | null>(null);
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;
  const connectionError = connErrorKey ? t.conn[connErrorKey] : null;
  const [snapshot, setSnapshot] = useState<AgentSnapshot | null>(null);
  const [events, setEvents] = useState<RaidEvent[]>([]);
  const [attempt, setAttempt] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Load saved credentials (and the one-click link "#agent=...&token=..." printed by the agent).
  useEffect(() => {
    let url = localStorage.getItem(URL_KEY) || DEFAULT_AGENT_URL;
    let tok = localStorage.getItem(TOKEN_KEY) || "";
    const hash = window.location.hash.replace(/^#/, "");
    if (hash.includes("token=")) {
      const params = new URLSearchParams(hash);
      const t = params.get("token");
      const a = params.get("agent");
      if (t) {
        tok = t;
        if (a) url = a;
        localStorage.setItem(URL_KEY, normalizeUrl(url));
        localStorage.setItem(TOKEN_KEY, tok);
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
    setAgentUrl(normalizeUrl(url));
    setToken(tok);
    setHydrated(true);
  }, []);

  const setCredentials = useCallback((url: string, tok: string) => {
    const u = normalizeUrl(url);
    localStorage.setItem(URL_KEY, u);
    localStorage.setItem(TOKEN_KEY, tok.trim());
    setAgentUrl(u);
    setToken(tok.trim());
    setAttempt((a) => a + 1);
  }, []);

  const reconnect = useCallback(() => setAttempt((a) => a + 1), []);

  const call = useCallback(
    async <T,>(path: string, init?: { method?: string; body?: unknown }): Promise<T> => {
      let res: Response;
      try {
        res = await fetch(`${agentUrl}${path}`, {
          method: init?.method ?? "GET",
          headers: {
            "X-Agent-Token": token,
            ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
          },
          ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
        });
      } catch {
        throw new AgentError(tRef.current.conn.unreachable);
      }
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        /* sem corpo */
      }
      if (!res.ok) {
        const d = data as { message?: string; error?: string } | null;
        throw new AgentError(d?.message || d?.error || tRef.current.conn.httpError(res.status));
      }
      return data as T;
    },
    [agentUrl, token],
  );

  // Connection loop: check token over HTTP, then keep a live WebSocket with auto-reconnect.
  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      setConnection("idle");
      setSnapshot(null);
      return;
    }
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    const scheduleRetry = () => {
      if (cancelled) return;
      failures += 1;
      const delay = Math.min(10000, 1000 * 2 ** Math.min(failures - 1, 4));
      retryTimer = setTimeout(connect, delay);
    };

    async function connect() {
      if (cancelled) return;
      setConnection((c) => (c === "connected" ? c : "connecting"));
      try {
        const res = await fetch(`${agentUrl}/api/state`, { headers: { "X-Agent-Token": token } });
        if (res.status === 401) {
          setConnection("unauthorized");
          setConnectionError("tokenRefused");
          retryTimer = setTimeout(connect, 15000);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const snap = (await res.json()) as AgentSnapshot;
        if (cancelled) return;
        setSnapshot(snap);
      } catch {
        setConnection("offline");
        setConnectionError("notFound");
        scheduleRetry();
        return;
      }

      const wsUrl = `${agentUrl.replace(/^http/, "ws")}/ws?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      let ping: ReturnType<typeof setInterval> | undefined;
      ws.onopen = () => {
        failures = 0;
        setConnection("connected");
        setConnectionError(null);
        ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send("ping"), 15000);
      };
      ws.onmessage = (ev) => {
        let msg: { type: string; data?: unknown; events?: unknown; event?: unknown; entry?: unknown };
        try {
          msg = JSON.parse(ev.data as string);
        } catch {
          return;
        }
        if (msg.type === "snapshot") setSnapshot(msg.data as AgentSnapshot);
        else if (msg.type === "events") setEvents(msg.events as RaidEvent[]);
        else if (msg.type === "event") {
          const e = msg.event as RaidEvent;
          setEvents((prev) => {
            const i = prev.findIndex((p) => p.id === e.id);
            if (i === -1) return [e, ...prev].slice(0, 1000);
            const next = prev.slice();
            next[i] = e;
            return next;
          });
        } else if (msg.type === "log") {
          const entry = msg.entry as LogEntry;
          setSnapshot((s) => (s ? { ...s, logs: [...s.logs, entry].slice(-60) } : s));
        }
      };
      ws.onclose = () => {
        if (ping) clearInterval(ping);
        if (wsRef.current === ws) wsRef.current = null;
        if (cancelled) return;
        setConnection("offline");
        setConnectionError("lost");
        scheduleRetry();
      };
      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [agentUrl, token, hydrated, attempt]);

  const value = useMemo<AgentContextValue>(
    () => ({
      agentUrl,
      token,
      hydrated,
      connection,
      connectionError,
      snapshot,
      events,
      setCredentials,
      reconnect,
      call,
    }),
    [agentUrl, token, hydrated, connection, connectionError, snapshot, events, setCredentials, reconnect, call],
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgent must be used inside <AgentProvider>");
  return ctx;
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
