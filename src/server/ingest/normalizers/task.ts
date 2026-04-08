import type { HookPayload } from "../validate";
import type { NormalizedEvent } from "../normalize";
import { generateId } from "@/lib/id";

/**
 * Normalize task-related hook events:
 * - TaskCreated → task.created
 * - TaskCompleted → task.completed
 */
export function normalizeTaskEvent(payload: HookPayload): NormalizedEvent {
  const hookName = payload.hook_event_name;

  // Try to extract task_id from payload; generate if missing
  const taskId = (payload.task_id as string)
    || (payload.taskId as string)
    || `task-${generateId()}`;

  switch (hookName) {
    case "TaskCreated": {
      const subject = (payload.subject as string)
        || (payload.task_subject as string)
        || (payload.description as string)
        || "";

      return {
        eventType: "task.created",
        eventCategory: "task",
        sessionId: payload.session_id,
        taskId,
        agentId: payload.agent_id,
        teamName: payload.team_name as string | undefined,
        teammateName: payload.teammate_name as string | undefined,
        status: "pending",
        severity: "info",
        payloadJson: JSON.stringify({
          task_id: taskId,
          subject,
          description: payload.description,
        }),
        searchText: `task created ${subject}`.slice(0, 300),
      };
    }

    case "TaskCompleted": {
      return {
        eventType: "task.completed",
        eventCategory: "task",
        sessionId: payload.session_id,
        taskId,
        agentId: payload.agent_id,
        status: "completed",
        severity: "info",
        payloadJson: JSON.stringify({
          task_id: taskId,
          result: payload.result,
        }),
        searchText: `task completed ${taskId}`,
      };
    }

    default:
      throw new Error(`Unknown task hook event: ${hookName}`);
  }
}
