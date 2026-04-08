import { db } from "@/db/init";
import { sessionCurrent } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { nowISO } from "@/lib/timestamps";
import { onSessionRevived } from "../heartbeat";
import type { NormalizedEvent } from "../ingest/normalize";

const TERMINAL_STATES = new Set(["stopped", "failed"]);

export function updateSessionProjection(event: NormalizedEvent, eventId: string) {
  const now = nowISO();
  const sessionId = event.sessionId;
  if (!sessionId) return;

  // Check existing session
  const existing = db
    .select()
    .from(sessionCurrent)
    .where(eq(sessionCurrent.sessionId, sessionId))
    .get();

  if (!existing) {
    // New session — only create on session.started or session.resumed
    if (event.eventType === "session.started" || event.eventType === "session.resumed") {
      const payload = JSON.parse(event.payloadJson);
      db.insert(sessionCurrent).values({
        sessionId,
        workingDirectory: payload.cwd,
        transcriptPath: payload.transcript_path,
        permissionMode: payload.permission_mode,
        startSource: payload.source,
        startedAt: now,
        lastActivityAt: now,
        currentState: "running",
        lastEventId: eventId,
        lastEventType: event.eventType,
        eventCount: 1,
      }).run();
    }
    return;
  }

  // Stale recovery: if session was stale and gets a new event, revive it
  if (existing.currentState === "stale") {
    onSessionRevived(sessionId);
  }

  // State transition guard: don't regress from terminal states
  // unless it's an explicit new session start
  if (
    TERMINAL_STATES.has(existing.currentState) &&
    event.eventType !== "session.started" &&
    event.eventType !== "session.resumed"
  ) {
    // Still update counters and last_activity, but don't change state
    db.update(sessionCurrent)
      .set({
        lastActivityAt: now,
        lastEventId: eventId,
        lastEventType: event.eventType,
        eventCount: existing.eventCount + 1,
      })
      .where(eq(sessionCurrent.sessionId, sessionId))
      .run();
    return;
  }

  // Determine new state based on event type
  let newState = existing.currentState;
  const updates: Record<string, unknown> = {
    lastActivityAt: now,
    lastEventId: eventId,
    lastEventType: event.eventType,
    eventCount: existing.eventCount + 1,
  };

  switch (event.eventType) {
    case "session.started":
    case "session.resumed": {
      const payload = JSON.parse(event.payloadJson);
      newState = "running";
      updates.workingDirectory = payload.cwd || existing.workingDirectory;
      updates.transcriptPath = payload.transcript_path || existing.transcriptPath;
      updates.permissionMode = payload.permission_mode || existing.permissionMode;
      updates.startSource = payload.source;
      updates.startedAt = now;
      updates.stoppedAt = null;
      updates.stopReason = null;
      updates.staleAt = null;
      break;
    }

    case "session.stopped": {
      const payload = JSON.parse(event.payloadJson);
      newState = "stopped";
      updates.stoppedAt = now;
      if (payload.last_assistant_message) {
        updates.lastAssistantMessageExcerpt =
          String(payload.last_assistant_message).slice(0, 500);
      }
      break;
    }

    case "session.stop_failed":
      newState = "failed";
      updates.stoppedAt = now;
      break;

    case "session.ended": {
      const payload = JSON.parse(event.payloadJson);
      newState = "stopped";
      updates.stoppedAt = now;
      updates.stopReason = payload.reason;
      break;
    }

    case "session.compacted":
      newState = "running"; // back to running after compact
      break;

    case "session.cleared":
      newState = "running";
      break;
  }

  updates.currentState = newState;

  db.update(sessionCurrent)
    .set(updates)
    .where(eq(sessionCurrent.sessionId, sessionId))
    .run();
}
