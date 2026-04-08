import crypto from "crypto";
import { db } from "@/db/init";
import { rawEvents } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface HookPayload {
  session_id: string;
  hook_event_name: string;
  cwd?: string;
  transcript_path?: string;
  permission_mode?: string;
  agent_id?: string;
  agent_type?: string;
  [key: string]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  isDuplicate: boolean;
  idempotencyKey: string;
}

/**
 * Hash only stable payload fields — excludes timestamps and transport metadata
 * so that retries of the same logical event produce the same key.
 */
function computeStableHash(payload: HookPayload): string {
  // Pick fields that identify the logical event (not transport metadata)
  const stable: Record<string, unknown> = {
    session_id: payload.session_id,
    hook_event_name: payload.hook_event_name,
    tool_name: payload.tool_name,
    tool_input: payload.tool_input,
    agent_id: payload.agent_id,
    agent_type: payload.agent_type,
    task_id: payload.task_id,
    source: payload.source,
    subject: payload.subject,
    reason: payload.reason,
  };
  // Remove undefined values
  const filtered = Object.fromEntries(
    Object.entries(stable).filter(([, v]) => v !== undefined)
  );
  const str = JSON.stringify(filtered, Object.keys(filtered).sort());
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 16);
}

export function generateIdempotencyKey(payload: HookPayload): string {
  const hash = computeStableHash(payload);
  // Use observed_at from payload if present (stable), otherwise omit from key
  const timeComponent = typeof payload.observed_at === "string"
    ? payload.observed_at
    : "no-ts";
  return `${payload.session_id}:${payload.hook_event_name}:${timeComponent}:${hash}`;
}

export function validateHookPayload(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Invalid payload: not an object", isDuplicate: false, idempotencyKey: "" };
  }

  const p = payload as HookPayload;

  if (!p.session_id || typeof p.session_id !== "string") {
    return { valid: false, error: "Missing or invalid session_id", isDuplicate: false, idempotencyKey: "" };
  }

  if (!p.hook_event_name || typeof p.hook_event_name !== "string") {
    return { valid: false, error: "Missing or invalid hook_event_name", isDuplicate: false, idempotencyKey: "" };
  }

  const idempotencyKey = generateIdempotencyKey(p);

  // Check for duplicates
  const existing = db
    .select({ id: rawEvents.id })
    .from(rawEvents)
    .where(eq(rawEvents.idempotencyKey, idempotencyKey))
    .get();

  return {
    valid: true,
    isDuplicate: !!existing,
    idempotencyKey,
  };
}
