import { db, ensureMigrated } from "@/db/init";
import { sessionCurrent } from "@/db/schema";
import { eq, and, lt, notInArray } from "drizzle-orm";
import { nowISO } from "@/lib/timestamps";
import { raiseAlert, clearAlert } from "./projection/alert";
import { broadcast } from "./sse";

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds

let intervalId: ReturnType<typeof setInterval> | null = null;

function checkStale() {
  try {
    ensureMigrated();
    const now = new Date();
    const threshold = new Date(now.getTime() - STALE_THRESHOLD_MS).toISOString();

    // Find running sessions with no recent activity
    const staleSessions = db
      .select()
      .from(sessionCurrent)
      .where(
        and(
          eq(sessionCurrent.currentState, "running"),
          lt(sessionCurrent.lastActivityAt, threshold)
        )
      )
      .all();

    for (const session of staleSessions) {
      // Mark as stale
      db.update(sessionCurrent)
        .set({
          currentState: "stale",
          staleAt: nowISO(),
        })
        .where(eq(sessionCurrent.sessionId, session.sessionId))
        .run();

      // Raise alert
      raiseAlert({
        alertType: "session.stale",
        alertScopeType: "session",
        alertScopeId: session.sessionId,
        title: "Session stale",
        message: `Session ${session.sessionId.slice(0, 12)} has no activity for ${Math.round(STALE_THRESHOLD_MS / 60000)} minutes`,
        severity: "warning",
      });

      broadcast("session", {
        sessionId: session.sessionId,
        currentState: "stale",
      });
    }
  } catch (err) {
    console.error("[heartbeat] checkStale failed:", err);
  }
}

/**
 * Called from session projection when a new event arrives for a stale session.
 * Clears the stale alert.
 */
export function onSessionRevived(sessionId: string) {
  clearAlert("session.stale", "session", sessionId);
}

export function startHeartbeat() {
  if (intervalId) return;
  intervalId = setInterval(checkStale, CHECK_INTERVAL_MS);
}

export function stopHeartbeat() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
