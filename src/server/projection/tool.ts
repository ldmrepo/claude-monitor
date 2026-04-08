import { db } from "@/db/init";
import { toolExecCurrent, sessionCurrent } from "@/db/schema";
import { eq, and, sql, type SQL } from "drizzle-orm";
import { generateId } from "@/lib/id";
import { nowISO } from "@/lib/timestamps";
import type { NormalizedEvent } from "../ingest/normalize";

/**
 * Find the most recent running tool execution matching session + tool_name.
 * Uses agentId as additional discriminator when available to handle
 * concurrent same-name tools from different agents.
 */
function findPendingTool(sessionId: string, toolName: string, agentId?: string) {
  const conditions: SQL[] = [
    eq(toolExecCurrent.sessionId, sessionId),
    eq(toolExecCurrent.toolName, toolName),
    eq(toolExecCurrent.currentState, "running"),
  ];

  // Try with agentId first for more precise matching
  if (agentId) {
    conditions.push(eq(toolExecCurrent.agentId, agentId));
    const match = db
      .select()
      .from(toolExecCurrent)
      .where(and(...conditions))
      .orderBy(sql`${toolExecCurrent.requestedAt} DESC`)
      .limit(1)
      .get();
    if (match) return match;

    // Fall back to without agentId if no match
    conditions.pop();
  }

  return db
    .select()
    .from(toolExecCurrent)
    .where(and(...conditions))
    .orderBy(sql`${toolExecCurrent.requestedAt} DESC`)
    .limit(1)
    .get();
}

export function updateToolProjection(event: NormalizedEvent, eventId: string) {
  const now = nowISO();
  const sessionId = event.sessionId;
  if (!sessionId) return;

  const payload = JSON.parse(event.payloadJson);
  const toolName: string = payload.tool_name || "unknown";
  const toolCategory: string = payload.tool_category || "other";

  switch (event.eventType) {
    case "tool.requested": {
      const toolExecId = generateId();
      db.insert(toolExecCurrent).values({
        toolExecutionId: toolExecId,
        toolUseId: event.toolUseId,
        sessionId,
        agentId: event.agentId,
        toolName,
        toolCategory,
        requestedAt: now,
        startedAt: now,
        currentState: "running",
        inputExcerpt: (payload.input_excerpt as string)?.slice(0, 500) || null,
        lastEventId: eventId,
      }).run();

      db.update(sessionCurrent)
        .set({
          toolCallCount: sql`${sessionCurrent.toolCallCount} + 1`,
          lastActivityAt: now,
          lastEventId: eventId,
          lastEventType: event.eventType,
          eventCount: sql`${sessionCurrent.eventCount} + 1`,
        })
        .where(eq(sessionCurrent.sessionId, sessionId))
        .run();
      break;
    }

    case "tool.succeeded": {
      const pending = findPendingTool(sessionId, toolName, event.agentId);

      if (pending) {
        const startTime = pending.startedAt ? new Date(pending.startedAt).getTime() : 0;
        const durationMs = startTime > 0 ? Date.now() - startTime : null;

        db.update(toolExecCurrent)
          .set({
            currentState: "succeeded",
            finishedAt: now,
            durationMs,
            lastEventId: eventId,
          })
          .where(eq(toolExecCurrent.toolExecutionId, pending.toolExecutionId))
          .run();
      }

      db.update(sessionCurrent)
        .set({
          lastActivityAt: now,
          lastEventId: eventId,
          lastEventType: event.eventType,
          eventCount: sql`${sessionCurrent.eventCount} + 1`,
        })
        .where(eq(sessionCurrent.sessionId, sessionId))
        .run();
      break;
    }

    case "tool.failed": {
      const pending = findPendingTool(sessionId, toolName, event.agentId);

      if (pending) {
        const startTime = pending.startedAt ? new Date(pending.startedAt).getTime() : 0;
        const durationMs = startTime > 0 ? Date.now() - startTime : null;

        db.update(toolExecCurrent)
          .set({
            currentState: "failed",
            finishedAt: now,
            durationMs,
            errorMessage: (payload.error_message as string)?.slice(0, 1000) || null,
            lastEventId: eventId,
          })
          .where(eq(toolExecCurrent.toolExecutionId, pending.toolExecutionId))
          .run();
      }

      db.update(sessionCurrent)
        .set({
          errorCount: sql`${sessionCurrent.errorCount} + 1`,
          lastActivityAt: now,
          lastEventId: eventId,
          lastEventType: event.eventType,
          eventCount: sql`${sessionCurrent.eventCount} + 1`,
        })
        .where(eq(sessionCurrent.sessionId, sessionId))
        .run();
      break;
    }
  }
}
