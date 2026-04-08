import type { HookPayload } from "../validate";
import type { NormalizedEvent } from "../normalize";

/**
 * Normalize agent/subagent hook events:
 * - SubagentStart → agent.started
 * - SubagentStop → agent.stopped
 */
export function normalizeAgentEvent(payload: HookPayload): NormalizedEvent {
  const hookName = payload.hook_event_name;
  const agentId = payload.agent_id || "unknown-agent";
  const agentType = (payload.agent_type as string) || "general-purpose";

  switch (hookName) {
    case "SubagentStart": {
      return {
        eventType: "agent.started",
        eventCategory: "agent",
        sessionId: payload.session_id,
        agentId,
        teamName: payload.team_name as string | undefined,
        teammateName: payload.teammate_name as string | undefined,
        status: "running",
        severity: "info",
        payloadJson: JSON.stringify({
          agent_id: agentId,
          agent_type: agentType,
        }),
        searchText: `agent started ${agentType} ${agentId}`,
      };
    }

    case "SubagentStop": {
      return {
        eventType: "agent.stopped",
        eventCategory: "agent",
        sessionId: payload.session_id,
        agentId,
        status: "stopped",
        severity: "info",
        payloadJson: JSON.stringify({
          agent_id: agentId,
          agent_type: agentType,
        }),
        searchText: `agent stopped ${agentType} ${agentId}`,
      };
    }

    default:
      throw new Error(`Unknown agent hook event: ${hookName}`);
  }
}
