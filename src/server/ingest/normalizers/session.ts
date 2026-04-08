import type { HookPayload } from "../validate";
import type { NormalizedEvent } from "../normalize";

/**
 * Normalize session-related hook events:
 * - SessionStart → session.started / session.resumed / session.cleared / session.compacted
 * - Stop → session.stopped
 * - SessionEnd → session.ended
 */
export function normalizeSessionEvent(payload: HookPayload): NormalizedEvent {
  const hookName = payload.hook_event_name;

  switch (hookName) {
    case "SessionStart": {
      const source = (payload.source as string) || "startup";
      const eventTypeMap: Record<string, string> = {
        startup: "session.started",
        resume: "session.resumed",
        clear: "session.cleared",
        compact: "session.compacted",
      };
      return {
        eventType: eventTypeMap[source] || "session.started",
        eventCategory: "session",
        sessionId: payload.session_id,
        status: "running",
        severity: "info",
        payloadJson: JSON.stringify({
          source,
          cwd: payload.cwd,
          transcript_path: payload.transcript_path,
          permission_mode: payload.permission_mode,
        }),
        searchText: `session ${source} ${payload.cwd || ""}`,
      };
    }

    case "Stop": {
      return {
        eventType: "session.stopped",
        eventCategory: "session",
        sessionId: payload.session_id,
        status: "stopped",
        severity: "info",
        payloadJson: JSON.stringify({
          last_assistant_message: payload.last_assistant_message,
        }),
        searchText: "session stopped",
      };
    }

    case "StopFailure": {
      return {
        eventType: "session.stop_failed",
        eventCategory: "session",
        sessionId: payload.session_id,
        status: "failed",
        severity: "error",
        payloadJson: JSON.stringify(payload),
        searchText: "session stop failed",
      };
    }

    case "SessionEnd": {
      return {
        eventType: "session.ended",
        eventCategory: "session",
        sessionId: payload.session_id,
        status: "stopped",
        severity: "info",
        payloadJson: JSON.stringify({
          reason: payload.reason,
        }),
        searchText: `session ended ${(payload.reason as string) || ""}`,
      };
    }

    default:
      throw new Error(`Unknown session hook event: ${hookName}`);
  }
}
