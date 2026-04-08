import { db } from "@/db/init";
import { taskCurrent, sessionCurrent } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { nowISO } from "@/lib/timestamps";
import type { NormalizedEvent } from "../ingest/normalize";

export function updateTaskProjection(event: NormalizedEvent, eventId: string) {
  const now = nowISO();
  const sessionId = event.sessionId;
  const taskId = event.taskId;
  if (!sessionId || !taskId) return;

  const payload = JSON.parse(event.payloadJson);

  switch (event.eventType) {
    case "task.created": {
      // Upsert task
      const existing = db
        .select()
        .from(taskCurrent)
        .where(eq(taskCurrent.taskId, taskId))
        .get();

      if (!existing) {
        db.insert(taskCurrent).values({
          taskId,
          sessionId,
          teamName: event.teamName || null,
          teammateName: event.teammateName || null,
          taskSubject: payload.subject || null,
          taskDescription: payload.description || null,
          createdAt: now,
          updatedAt: now,
          currentState: "pending",
          assigneeAgentId: event.agentId || null,
          lastEventId: eventId,
        }).run();
      }

      // Increment session active task count
      db.update(sessionCurrent)
        .set({
          activeTaskCount: sql`${sessionCurrent.activeTaskCount} + 1`,
          lastActivityAt: now,
          lastEventId: eventId,
          lastEventType: event.eventType,
          eventCount: sql`${sessionCurrent.eventCount} + 1`,
        })
        .where(eq(sessionCurrent.sessionId, sessionId))
        .run();
      break;
    }

    case "task.completed": {
      const existing = db
        .select()
        .from(taskCurrent)
        .where(eq(taskCurrent.taskId, taskId))
        .get();

      if (existing && existing.currentState !== "completed") {
        db.update(taskCurrent)
          .set({
            currentState: "completed",
            completedAt: now,
            updatedAt: now,
            lastEventId: eventId,
          })
          .where(eq(taskCurrent.taskId, taskId))
          .run();

        // Decrement session active task count
        db.update(sessionCurrent)
          .set({
            activeTaskCount: sql`MAX(${sessionCurrent.activeTaskCount} - 1, 0)`,
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
