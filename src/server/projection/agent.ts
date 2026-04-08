import { db } from "@/db/init";
import { agentCurrent, sessionCurrent } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { nowISO } from "@/lib/timestamps";
import type { NormalizedEvent } from "../ingest/normalize";

export function updateAgentProjection(event: NormalizedEvent, eventId: string) {
  const now = nowISO();
  const sessionId = event.sessionId;
  const agentId = event.agentId;
  if (!sessionId || !agentId) return;

  const payload = JSON.parse(event.payloadJson);

  switch (event.eventType) {
    case "agent.started": {
      const existing = db
        .select()
        .from(agentCurrent)
        .where(eq(agentCurrent.agentId, agentId))
        .get();

      if (!existing) {
        db.insert(agentCurrent).values({
          agentId,
          sessionId,
          agentType: payload.agent_type || null,
          teamName: event.teamName || null,
          teammateName: event.teammateName || null,
          startedAt: now,
          lastActivityAt: now,
          currentState: "running",
          lastEventId: eventId,
        }).run();
      } else {
        db.update(agentCurrent)
          .set({
            currentState: "running",
            startedAt: now,
            lastActivityAt: now,
            stoppedAt: null,
            lastEventId: eventId,
          })
          .where(eq(agentCurrent.agentId, agentId))
          .run();
      }

      // Increment session active agent count
      db.update(sessionCurrent)
        .set({
          activeAgentCount: sql`${sessionCurrent.activeAgentCount} + 1`,
          lastActivityAt: now,
          lastEventId: eventId,
          lastEventType: event.eventType,
          eventCount: sql`${sessionCurrent.eventCount} + 1`,
        })
        .where(eq(sessionCurrent.sessionId, sessionId))
        .run();
      break;
    }

    case "agent.stopped": {
      const existing = db
        .select()
        .from(agentCurrent)
        .where(eq(agentCurrent.agentId, agentId))
        .get();

      if (existing && existing.currentState !== "stopped") {
        db.update(agentCurrent)
          .set({
            currentState: "stopped",
            stoppedAt: now,
            lastActivityAt: now,
            lastEventId: eventId,
          })
          .where(eq(agentCurrent.agentId, agentId))
          .run();

        // Decrement session active agent count
        db.update(sessionCurrent)
          .set({
            activeAgentCount: sql`MAX(${sessionCurrent.activeAgentCount} - 1, 0)`,
            lastActivityAt: now,
            lastEventId: eventId,
            lastEventType: event.eventType,
            eventCount: sql`${sessionCurrent.eventCount} + 1`,
          })
          .where(eq(sessionCurrent.sessionId, sessionId))
          .run();
      }
      break;
    }
  }
}
