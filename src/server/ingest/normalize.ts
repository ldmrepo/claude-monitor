import type { EventCategory, Severity } from "@/lib/constants";
import type { HookPayload } from "./validate";

export interface NormalizedEvent {
  eventType: string;
  eventCategory: EventCategory;
  sessionId: string;
  taskId?: string;
  toolUseId?: string;
  agentId?: string;
  teamName?: string;
  teammateName?: string;
  status?: string;
  severity: Severity;
  payloadJson: string;
  searchText?: string;
}

/**
 * Normalize a raw hook payload into a standard event.
 * Each hook_event_name maps to specific normalizer functions.
 * This is the default fallback normalizer - specific normalizers
 * (session, tool, task, agent) override this for their event types.
 */
export function normalizeEvent(payload: HookPayload): NormalizedEvent {
  const hookName = payload.hook_event_name;

  return {
    eventType: `unknown.${hookName.toLowerCase()}`,
    eventCategory: "session",
    sessionId: payload.session_id,
    agentId: payload.agent_id,
    teamName: payload.team_name as string | undefined,
    teammateName: payload.teammate_name as string | undefined,
    status: "info",
    severity: "info",
    payloadJson: JSON.stringify(payload),
    searchText: hookName,
  };
}
