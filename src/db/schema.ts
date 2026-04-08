import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ── raw_events ──────────────────────────────────────────────
export const rawEvents = sqliteTable("raw_events", {
  id: text("id").primaryKey(), // ULID
  envelopeId: text("envelope_id"),
  sourceInstanceId: text("source_instance_id"),
  sourceHost: text("source_host"),
  rawEventType: text("raw_event_type").notNull(),
  rawPayloadJson: text("raw_payload_json").notNull(),
  rawPayloadSize: integer("raw_payload_size"),
  observedAt: text("observed_at").notNull(),
  collectedAt: text("collected_at").notNull(),
  receivedAt: text("received_at").notNull(),
  schemaVersion: text("schema_version").default("1"),
  idempotencyKey: text("idempotency_key").unique(),
  normalizationStatus: text("normalization_status").notNull().default("pending"),
  normalizationError: text("normalization_error"),
  parseError: text("parse_error"),
  duplicateState: text("duplicate_state").default("new"),
  tagsJson: text("tags_json"),
});

// ── events (normalized) ─────────────────────────────────────
export const events = sqliteTable("events", {
  id: text("id").primaryKey(), // ULID
  eventType: text("event_type").notNull(),
  eventCategory: text("event_category").notNull(),
  eventVersion: text("event_version").default("1"),
  sourceEventRef: text("source_event_ref"),
  rawEventId: text("raw_event_id").references(() => rawEvents.id),
  sourceInstanceId: text("source_instance_id"),
  sessionId: text("session_id"),
  taskId: text("task_id"),
  toolUseId: text("tool_use_id"),
  agentId: text("agent_id"),
  teamName: text("team_name"),
  teammateName: text("teammate_name"),
  observedAt: text("observed_at").notNull(),
  collectedAt: text("collected_at"),
  normalizedAt: text("normalized_at").notNull(),
  status: text("status"),
  severity: text("severity").default("info"),
  payloadJson: text("payload_json"),
  searchText: text("search_text"),
  orderingKey: text("ordering_key"),
});

// ── session_current (projection) ────────────────────────────
export const sessionCurrent = sqliteTable("session_current", {
  sessionId: text("session_id").primaryKey(),
  sourceInstanceId: text("source_instance_id"),
  sessionName: text("session_name"),
  modelName: text("model_name"),
  workingDirectory: text("working_directory"),
  transcriptPath: text("transcript_path"),
  permissionMode: text("permission_mode"),
  activeAgentType: text("active_agent_type"),
  startSource: text("start_source"),
  startedAt: text("started_at"),
  lastActivityAt: text("last_activity_at"),
  stoppedAt: text("stopped_at"),
  currentState: text("current_state").notNull().default("initializing"),
  stopReason: text("stop_reason"),
  lastUserPromptExcerpt: text("last_user_prompt_excerpt"),
  lastAssistantMessageExcerpt: text("last_assistant_message_excerpt"),
  lastEventId: text("last_event_id"),
  lastEventType: text("last_event_type"),
  eventCount: integer("event_count").notNull().default(0),
  promptCount: integer("prompt_count").notNull().default(0),
  toolCallCount: integer("tool_call_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  warningCount: integer("warning_count").notNull().default(0),
  activeTaskCount: integer("active_task_count").notNull().default(0),
  activeAgentCount: integer("active_agent_count").notNull().default(0),
  staleAt: text("stale_at"),
  metadataJson: text("metadata_json"),
});

// ── task_current (projection) ───────────────────────────────
export const taskCurrent = sqliteTable("task_current", {
  taskId: text("task_id").primaryKey(),
  sessionId: text("session_id").notNull(),
  teamName: text("team_name"),
  teammateName: text("teammate_name"),
  taskSubject: text("task_subject"),
  taskDescription: text("task_description"),
  createdAt: text("created_at"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  updatedAt: text("updated_at"),
  currentState: text("current_state").notNull().default("pending"),
  assigneeAgentId: text("assignee_agent_id"),
  assigneeName: text("assignee_name"),
  priority: text("priority"),
  blockedReason: text("blocked_reason"),
  lastEventId: text("last_event_id"),
  metadataJson: text("metadata_json"),
});

// ── tool_exec_current (projection) ──────────────────────────
export const toolExecCurrent = sqliteTable("tool_exec_current", {
  toolExecutionId: text("tool_execution_id").primaryKey(), // ULID
  toolUseId: text("tool_use_id"),
  sessionId: text("session_id").notNull(),
  taskId: text("task_id"),
  agentId: text("agent_id"),
  toolName: text("tool_name").notNull(),
  toolCategory: text("tool_category"),
  requestedAt: text("requested_at"),
  startedAt: text("started_at"),
  finishedAt: text("finished_at"),
  currentState: text("current_state").notNull().default("requested"),
  permissionState: text("permission_state").default("not_required"),
  durationMs: integer("duration_ms"),
  runInBackground: integer("run_in_background", { mode: "boolean" }).default(false),
  inputExcerpt: text("input_excerpt"),
  outputExcerpt: text("output_excerpt"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  lastEventId: text("last_event_id"),
  metadataJson: text("metadata_json"),
});

// ── agent_current (projection) ──────────────────────────────
export const agentCurrent = sqliteTable("agent_current", {
  agentId: text("agent_id").primaryKey(),
  sessionId: text("session_id").notNull(),
  teamName: text("team_name"),
  teammateName: text("teammate_name"),
  agentType: text("agent_type"),
  modelName: text("model_name"),
  parentAgentId: text("parent_agent_id"),
  startedAt: text("started_at"),
  lastActivityAt: text("last_activity_at"),
  stoppedAt: text("stopped_at"),
  currentState: text("current_state").notNull().default("starting"),
  transcriptPath: text("transcript_path"),
  lastMessageExcerpt: text("last_message_excerpt"),
  taskCountTotal: integer("task_count_total").default(0),
  taskCountOpen: integer("task_count_open").default(0),
  taskCountCompleted: integer("task_count_completed").default(0),
  errorCount: integer("error_count").default(0),
  idleSince: text("idle_since"),
  lastEventId: text("last_event_id"),
  metadataJson: text("metadata_json"),
});

// ── alert_current (projection) ──────────────────────────────
export const alertCurrent = sqliteTable("alert_current", {
  alertId: text("alert_id").primaryKey(), // ULID
  alertType: text("alert_type").notNull(),
  alertScopeType: text("alert_scope_type").notNull(),
  alertScopeId: text("alert_scope_id"),
  title: text("title").notNull(),
  message: text("message"),
  severity: text("severity").notNull().default("warning"),
  status: text("status").notNull().default("open"),
  raisedAt: text("raised_at").notNull(),
  acknowledgedAt: text("acknowledged_at"),
  clearedAt: text("cleared_at"),
  lastEventId: text("last_event_id"),
  fingerprint: text("fingerprint").unique(),
  sourceInstanceId: text("source_instance_id"),
  metadataJson: text("metadata_json"),
});

// ── processor_checkpoint ────────────────────────────────────
export const processorCheckpoint = sqliteTable("processor_checkpoint", {
  processorName: text("processor_name").primaryKey(),
  streamName: text("stream_name"),
  lastProcessedEventId: text("last_processed_event_id"),
  lastProcessedObservedAt: text("last_processed_observed_at"),
  lastProcessedAt: text("last_processed_at"),
  status: text("status").default("active"),
  metadataJson: text("metadata_json"),
});
