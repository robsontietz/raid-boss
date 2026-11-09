export type BossMonitorStatus = "ok" | "unreadable" | "confirming" | "waiting" | "disabled";

export interface BossSnapshot {
  id: string;
  name: string;
  level: number;
  row: number;
  enabled: boolean;
  state: string | null;
  bucket: string | null;
  color_hex: string | null;
  color_name: string | null;
  since: string | null;
  last_change: string | null;
  last_seen: string | null;
  monitor_status: BossMonitorStatus;
  reason: string | null;
  live_hex: string | null;
}

export interface LogEntry {
  at: string;
  level: string;
  message: string;
}

export interface AgentSnapshot {
  agent: { version: string; started_at: string; windows: boolean; ocr_available: boolean };
  monitoring: {
    active: boolean;
    status_text: string;
    last_update: string | null;
    last_attempt: string | null;
    next_update_at: string | null;
    interval_seconds: number;
    cycle_count: number;
    last_error: string | null;
    last_error_at: string | null;
    list_ok: boolean | null;
    valid_rows: number;
    rows: number;
  };
  window: {
    title: string;
    process: string;
    left: number;
    top: number;
    width: number;
    height: number;
    minimized: boolean;
    foreground: boolean;
  } | null;
  discord: {
    status: "ok" | "error" | "unknown" | "not_configured";
    configured: boolean;
    last_ok: string | null;
    last_error: string | null;
  };
  calibration: { calibrated: boolean; reference_ready: boolean; client_size: [number, number] | null };
  bosses: BossSnapshot[];
  monitored_count: number;
  changes_count: number;
  logs: LogEntry[];
}

export type DiscordDelivery = "pending" | "retrying" | "sent" | "failed" | "not_configured";

export interface RaidEvent {
  id: string;
  boss_id: string;
  boss_name: string;
  level: number;
  prev_state: string;
  new_state: string;
  prev_color: string;
  new_color: string;
  prev_bucket: string;
  new_bucket: string;
  detected_at: string;
  discord_status: DiscordDelivery;
  discord_error: string | null;
  discord_sent_at?: string;
}

export interface AgentConfig {
  panel_url: string;
  discord: { enabled: boolean; webhook_set: boolean; webhook_masked: string };
  window: { title_contains: string; process_name: string; bring_to_front: boolean };
  monitor: {
    interval_seconds: number;
    click_delay_ms: number;
    after_click_wait_ms: number;
    click_mode: "mouse" | "background";
    restore_mouse: boolean;
    confirm_reads: number;
    confirm_delay_ms: number;
    sensitivity: number;
    min_valid_rows_pct: number;
    row_match_threshold: number;
    auto_start: boolean;
  };
  calibration: {
    raid_button: { x: number; y: number } | null;
    list_region: { x: number; y: number; w: number; h: number } | null;
    rows: number;
    client_size: [number, number] | null;
  };
  state_labels: Record<string, string>;
  bosses: { id: string; name: string; level: number; row: number; enabled: boolean }[];
}

export interface RowDetail {
  row: number;
  valid: boolean;
  reason: string;
  bucket: string | null;
  hex: string | null;
  color_name: string | null;
  match: number | null;
  boss_name: string | null;
  state: string | null;
  ocr_text?: string | null;
  ocr_match?: number | null;
}

export interface TestResult {
  ok: boolean;
  message: string;
  image?: string;
  rows?: RowDetail[];
}

export type ConnectionState = "idle" | "connecting" | "connected" | "unauthorized" | "offline";
