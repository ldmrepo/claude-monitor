import { sqlite } from "./index";

/**
 * Create all tables if they don't exist.
 * Called on server startup (imported by db/index or app init).
 */
export function runMigrations() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS raw_events (
      id TEXT PRIMARY KEY,
      envelope_id TEXT,
      source_instance_id TEXT,
      source_host TEXT,
      raw_event_type TEXT NOT NULL,
      raw_payload_json TEXT NOT NULL,
      raw_payload_size INTEGER,
      observed_at TEXT NOT NULL,
      collected_at TEXT NOT NULL,
      received_at TEXT NOT NULL,
      schema_version TEXT DEFAULT '1',
      idempotency_key TEXT UNIQUE,
      normalization_status TEXT NOT NULL DEFAULT 'pending',
      normalization_error TEXT,
      parse_error TEXT,
      duplicate_state TEXT DEFAULT 'new',
      tags_json TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      event_category TEXT NOT NULL,
      event_version TEXT DEFAULT '1',
      source_event_ref TEXT,
      raw_event_id TEXT REFERENCES raw_events(id),
      source_instance_id TEXT,
      session_id TEXT,
      task_id TEXT,
      tool_use_id TEXT,
      agent_id TEXT,
      team_name TEXT,
      teammate_name TEXT,
      observed_at TEXT NOT NULL,
      collected_at TEXT,
      normalized_at TEXT NOT NULL,
      status TEXT,
      severity TEXT DEFAULT 'info',
      payload_json TEXT,
      search_text TEXT,
      ordering_key TEXT
    );

    CREATE TABLE IF NOT EXISTS session_current (
      session_id TEXT PRIMARY KEY,
      source_instance_id TEXT,
      session_name TEXT,
      model_name TEXT,
      working_directory TEXT,
      transcript_path TEXT,
      permission_mode TEXT,
      active_agent_type TEXT,
      start_source TEXT,
      started_at TEXT,
      last_activity_at TEXT,
      stopped_at TEXT,
      current_state TEXT NOT NULL DEFAULT 'initializing',
      stop_reason TEXT,
      last_user_prompt_excerpt TEXT,
      last_assistant_message_excerpt TEXT,
      last_event_id TEXT,
      last_event_type TEXT,
      event_count INTEGER NOT NULL DEFAULT 0,
      prompt_count INTEGER NOT NULL DEFAULT 0,
      tool_call_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      active_task_count INTEGER NOT NULL DEFAULT 0,
      active_agent_count INTEGER NOT NULL DEFAULT 0,
      stale_at TEXT,
      metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS task_current (
      task_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      team_name TEXT,
      teammate_name TEXT,
      task_subject TEXT,
      task_description TEXT,
      created_at TEXT,
      started_at TEXT,
      completed_at TEXT,
      updated_at TEXT,
      current_state TEXT NOT NULL DEFAULT 'pending',
      assignee_agent_id TEXT,
      assignee_name TEXT,
      priority TEXT,
      blocked_reason TEXT,
      last_event_id TEXT,
      metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS tool_exec_current (
      tool_execution_id TEXT PRIMARY KEY,
      tool_use_id TEXT,
      session_id TEXT NOT NULL,
      task_id TEXT,
      agent_id TEXT,
      tool_name TEXT NOT NULL,
      tool_category TEXT,
      requested_at TEXT,
      started_at TEXT,
      finished_at TEXT,
      current_state TEXT NOT NULL DEFAULT 'requested',
      permission_state TEXT DEFAULT 'not_required',
      duration_ms INTEGER,
      run_in_background INTEGER DEFAULT 0,
      input_excerpt TEXT,
      output_excerpt TEXT,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      last_event_id TEXT,
      metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS agent_current (
      agent_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      team_name TEXT,
      teammate_name TEXT,
      agent_type TEXT,
      model_name TEXT,
      parent_agent_id TEXT,
      started_at TEXT,
      last_activity_at TEXT,
      stopped_at TEXT,
      current_state TEXT NOT NULL DEFAULT 'starting',
      transcript_path TEXT,
      last_message_excerpt TEXT,
      task_count_total INTEGER DEFAULT 0,
      task_count_open INTEGER DEFAULT 0,
      task_count_completed INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      idle_since TEXT,
      last_event_id TEXT,
      metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS alert_current (
      alert_id TEXT PRIMARY KEY,
      alert_type TEXT NOT NULL,
      alert_scope_type TEXT NOT NULL,
      alert_scope_id TEXT,
      title TEXT NOT NULL,
      message TEXT,
      severity TEXT NOT NULL DEFAULT 'warning',
      status TEXT NOT NULL DEFAULT 'open',
      raised_at TEXT NOT NULL,
      acknowledged_at TEXT,
      cleared_at TEXT,
      last_event_id TEXT,
      fingerprint TEXT UNIQUE,
      source_instance_id TEXT,
      metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS processor_checkpoint (
      processor_name TEXT PRIMARY KEY,
      stream_name TEXT,
      last_processed_event_id TEXT,
      last_processed_observed_at TEXT,
      last_processed_at TEXT,
      status TEXT DEFAULT 'active',
      metadata_json TEXT
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_raw_events_idempotency ON raw_events(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_raw_events_type ON raw_events(raw_event_type);
    CREATE INDEX IF NOT EXISTS idx_raw_events_observed ON raw_events(observed_at);
    CREATE INDEX IF NOT EXISTS idx_raw_events_norm_status ON raw_events(normalization_status);

    CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_category ON events(event_category);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_observed ON events(observed_at);
    CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);
    CREATE INDEX IF NOT EXISTS idx_events_task ON events(task_id);
    CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_id);
    CREATE INDEX IF NOT EXISTS idx_events_tool ON events(tool_use_id);

    CREATE INDEX IF NOT EXISTS idx_session_state ON session_current(current_state);
    CREATE INDEX IF NOT EXISTS idx_session_activity ON session_current(last_activity_at);

    CREATE INDEX IF NOT EXISTS idx_task_state ON task_current(current_state);
    CREATE INDEX IF NOT EXISTS idx_task_session ON task_current(session_id);

    CREATE INDEX IF NOT EXISTS idx_tool_session ON tool_exec_current(session_id);
    CREATE INDEX IF NOT EXISTS idx_tool_state ON tool_exec_current(current_state);
    CREATE INDEX IF NOT EXISTS idx_tool_name ON tool_exec_current(tool_name);

    CREATE INDEX IF NOT EXISTS idx_agent_session ON agent_current(session_id);
    CREATE INDEX IF NOT EXISTS idx_agent_state ON agent_current(current_state);

    CREATE INDEX IF NOT EXISTS idx_alert_status ON alert_current(status);
    CREATE INDEX IF NOT EXISTS idx_alert_severity ON alert_current(severity);
    CREATE INDEX IF NOT EXISTS idx_alert_raised ON alert_current(raised_at);
  `);
}
