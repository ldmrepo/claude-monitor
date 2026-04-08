import { db } from "@/db/init";
import { toolExecCurrent, sessionCurrent } from "@/db/schema";
import { eq, and, sql, type SQL } from "drizzle-orm";
import { generateId } from "@/lib/id";
import { nowISO } from "@/lib/timestamps";
import type { NormalizedEvent } from "../ingest/normalize";

function findPendingTool(sessionId: string, toolName: string, agentId?: string) {
  const base: SQL[] = [
    eq(toolExecCurrent.sessionId, sessionId),
    eq(toolExecCurrent.toolName, toolName),
    eq(toolExecCurrent.currentState, "running"),
  ];

  if (agentId) {
    const match = db.select().from(toolExecCurrent)
      .where(and(...base, eq(toolExecCurrent.agentId, agentId)))
      .orderBy(sql`${toolExecCurrent.requestedAt} DESC`)
      .limit(1).get();
    if (match) return match;
  }

  return db.select().from(toolExecCurrent)
    .where(and(...base))
    .orderBy(sql`${toolExecCurrent.requestedAt} DESC`)
    .limit(1).get();
}

function completePendingTool(
  sessionId: string, toolName: string, agentId: string | undefined,
  state: "succeeded" | "failed", eventId: string, errorMessage?: string | null,
) {
  const pending = findPendingTool(sessionId, toolName, agentId);
  if (!pending) return;

  const now = nowISO();
  const startTime = pending.startedAt ? new Date(pending.startedAt).getTime() : 0;
  const durationMs = startTime > 0 ? Date.now() - startTime : null;

  db.update(toolExecCurrent)
    .set({
      currentState: state,
      finishedAt: now,
      durationMs,
      ...(errorMessage != null && { errorMessage }),
      lastEventId: eventId,
    })
    .where(eq(toolExecCurrent.toolExecutionId, pending.toolExecutionId))
    .run();
}

function updateSessionCounters(
  sessionId: string, eventId: string, eventType: string,
  extra?: Record<string, unknown>,
) {
  db.update(sessionCurrent)
    .set({
      lastActivityAt: nowISO(),
      lastEventId: eventId,
      lastEventType: eventType,
      eventCount: sql`${sessionCurrent.eventCount} + 1`,
      ...extra,
    })
    .where(eq(sessionCurrent.sessionId, sessionId))
    .run();
}

export function updateToolProjection(event: NormalizedEvent, eventId: string) {
  const sessionId = event.sessionId;
  if (!sessionId) return;

  const payload = JSON.parse(event.payloadJson);
  const toolName: string = payload.tool_name || "unknown";

  switch (event.eventType) {
    case "tool.requested": {
      db.insert(toolExecCurrent).values({
        toolExecutionId: generateId(),
        toolUseId: event.toolUseId,
        sessionId,
        agentId: event.agentId,
        toolName,
        toolCategory: payload.tool_category || "other",
        requestedAt: nowISO(),
        startedAt: nowISO(),
        currentState: "running",
        inputExcerpt: (payload.input_excerpt as string)?.slice(0, 500) || null,
        lastEventId: eventId,
      }).run();

      updateSessionCounters(sessionId, eventId, event.eventType, {
        toolCallCount: sql`${sessionCurrent.toolCallCount} + 1`,
      });
      break;
    }

    case "tool.succeeded": {
      completePendingTool(sessionId, toolName, event.agentId, "succeeded", eventId);
      updateSessionCounters(sessionId, eventId, event.eventType);
      break;
    }

    case "tool.failed": {
      completePendingTool(sessionId, toolName, event.agentId, "failed", eventId,
        (payload.error_message as string)?.slice(0, 1000) || null);
      updateSessionCounters(sessionId, eventId, event.eventType, {
        errorCount: sql`${sessionCurrent.errorCount} + 1`,
      });
      break;
    }
  }
}
