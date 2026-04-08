// ── Session States (04_DATA_MODEL 24.1) ────────────────────
export const SESSION_STATES = [
  "initializing",
  "running",
  "idle",
  "compacting",
  "stopped",
  "failed",
  "stale",
] as const;
export type SessionState = (typeof SESSION_STATES)[number];

// ── Task States (04_DATA_MODEL 24.2) ───────────────────────
export const TASK_STATES = [
  "pending",
  "in_progress",
  "blocked",
  "completed",
  "failed",
  "cancelled",
] as const;
export type TaskState = (typeof TASK_STATES)[number];

// ── Tool States (04_DATA_MODEL 24.3) ───────────────────────
export const TOOL_STATES = [
  "requested",
  "running",
  "succeeded",
  "failed",
  "denied",
  "deferred",
  "interrupted",
] as const;
export type ToolState = (typeof TOOL_STATES)[number];

// ── Agent States (04_DATA_MODEL 24.4) ──────────────────────
export const AGENT_STATES = [
  "starting",
  "running",
  "idle",
  "stopped",
  "failed",
  "stale",
] as const;
export type AgentState = (typeof AGENT_STATES)[number];

// ── Alert Status (04_DATA_MODEL 24.6) ──────────────────────
export const ALERT_STATUSES = [
  "open",
  "acknowledged",
  "cleared",
  "suppressed",
] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

// ── Severity (03_EVENT_COLLECTION 10.5) ────────────────────
export const SEVERITIES = ["info", "warning", "error", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

// ── Event Categories (03_EVENT_COLLECTION 10.4) ────────────
export const EVENT_CATEGORIES = [
  "session",
  "prompt",
  "tool",
  "task",
  "agent",
  "team",
  "permission",
  "hook",
  "compact",
  "collector",
  "alert",
  "worktree",
  "notification",
  "elicitation",
  "config",
  "file_watch",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

// ── Normalization Status ────────────────────────────────────
export const NORMALIZATION_STATUSES = [
  "pending",
  "normalized",
  "failed",
  "skipped",
] as const;
export type NormalizationStatus = (typeof NORMALIZATION_STATUSES)[number];

// ── Hook Event Names ────────────────────────────────────────
export const HOOK_EVENT_NAMES = [
  "SessionStart",
  "SessionEnd",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "SubagentStart",
  "SubagentStop",
  "TaskCreated",
  "TaskCompleted",
  "Stop",
  "StopFailure",
] as const;
export type HookEventName = (typeof HOOK_EVENT_NAMES)[number];
