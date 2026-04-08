import { db, ensureMigrated } from "@/db/init";
import { rawEvents, events } from "@/db/schema";
import { generateId } from "@/lib/id";
import { nowISO, parseObservedAt } from "@/lib/timestamps";
import { eq } from "drizzle-orm";
import { validateHookPayload, type HookPayload } from "./ingest/validate";
import { normalizeEvent, type NormalizedEvent } from "./ingest/normalize";
import { normalizeSessionEvent } from "./ingest/normalizers/session";
import { normalizeToolEvent } from "./ingest/normalizers/tool";
import { normalizeTaskEvent } from "./ingest/normalizers/task";
import { normalizeAgentEvent } from "./ingest/normalizers/agent";
import { updateSessionProjection } from "./projection/session";
import { updateToolProjection } from "./projection/tool";
import { updateTaskProjection } from "./projection/task";
import { updateAgentProjection } from "./projection/agent";
import { broadcast } from "./sse";
import { sqlite } from "@/db/index";

// Registry of normalizers by hook event name
const NORMALIZERS: Record<string, (payload: HookPayload) => NormalizedEvent> = {
  SessionStart: normalizeSessionEvent,
  Stop: normalizeSessionEvent,
  StopFailure: normalizeSessionEvent,
  SessionEnd: normalizeSessionEvent,
  PreToolUse: normalizeToolEvent,
  PostToolUse: normalizeToolEvent,
  PostToolUseFailure: normalizeToolEvent,
  TaskCreated: normalizeTaskEvent,
  TaskCompleted: normalizeTaskEvent,
  SubagentStart: normalizeAgentEvent,
  SubagentStop: normalizeAgentEvent,
};

// Registry of projection updaters by event category
const PROJECTION_UPDATERS: Record<string, (event: NormalizedEvent, eventId: string) => void> = {
  session: updateSessionProjection,
  tool: updateToolProjection,
  task: updateTaskProjection,
  agent: updateAgentProjection,
};

export interface PipelineResult {
  success: boolean;
  eventId?: string;
  rawEventId?: string;
  isDuplicate?: boolean;
  error?: string;
}

export function processHookEvent(payload: unknown): PipelineResult {
  ensureMigrated();

  // 1. Validate
  const validation = validateHookPayload(payload);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  if (validation.isDuplicate) {
    return { success: true, isDuplicate: true };
  }

  const hookPayload = payload as HookPayload;
  const observedAt = parseObservedAt(hookPayload);
  const now = nowISO();
  const rawEventId = generateId();

  // 2. Store raw event (always, even if normalization fails)
  const rawJson = JSON.stringify(hookPayload);
  try {
    db.insert(rawEvents).values({
      id: rawEventId,
      rawEventType: hookPayload.hook_event_name,
      rawPayloadJson: rawJson,
      rawPayloadSize: rawJson.length,
      observedAt,
      collectedAt: now,
      receivedAt: now,
      idempotencyKey: validation.idempotencyKey,
      normalizationStatus: "pending",
    }).run();
  } catch (err: unknown) {
    // If it's a UNIQUE constraint error on idempotency_key, treat as duplicate
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      return { success: true, isDuplicate: true };
    }
    return { success: false, error: `Failed to store raw event: ${err}` };
  }

  // 3. Normalize
  let normalized: NormalizedEvent;
  try {
    const normalizer = NORMALIZERS[hookPayload.hook_event_name] || normalizeEvent;
    normalized = normalizer(hookPayload);
  } catch (err) {
    // Mark raw event as normalization failed, but still stored
    db.update(rawEvents)
      .set({ normalizationStatus: "failed", normalizationError: String(err) })
      .where(eq(rawEvents.id, rawEventId))
      .run();
    return { success: true, rawEventId, error: `Normalization failed: ${err}` };
  }

  // 4. Store normalized event + update projection in a transaction
  const eventId = generateId();

  const runTransaction = sqlite.transaction(() => {
    // Insert normalized event
    db.insert(events).values({
      id: eventId,
      eventType: normalized.eventType,
      eventCategory: normalized.eventCategory,
      rawEventId,
      sessionId: normalized.sessionId,
      taskId: normalized.taskId,
      toolUseId: normalized.toolUseId,
      agentId: normalized.agentId,
      teamName: normalized.teamName,
      teammateName: normalized.teammateName,
      observedAt,
      collectedAt: now,
      normalizedAt: now,
      status: normalized.status,
      severity: normalized.severity,
      payloadJson: normalized.payloadJson,
      searchText: normalized.searchText,
      orderingKey: `${observedAt}:${eventId}`,
    }).run();

    // Update raw event status
    db.update(rawEvents)
      .set({ normalizationStatus: "normalized" })
      .where(eq(rawEvents.id, rawEventId))
      .run();

    // 5. Update projection
    const updater = PROJECTION_UPDATERS[normalized.eventCategory];
    if (updater) {
      updater(normalized, eventId);
    }
  });

  try {
    runTransaction();
  } catch (err) {
    return { success: false, rawEventId, error: `Transaction failed: ${err}` };
  }

  // 6. Broadcast SSE (outside transaction)
  broadcast(normalized.eventCategory, {
    eventId,
    eventType: normalized.eventType,
    sessionId: normalized.sessionId,
    taskId: normalized.taskId,
    agentId: normalized.agentId,
  });

  return { success: true, eventId, rawEventId };
}
