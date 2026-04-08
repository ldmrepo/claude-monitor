import type { HookPayload } from "../validate";
import type { NormalizedEvent } from "../normalize";

function extractToolName(payload: HookPayload): string {
  // tool_name can come from various places in the hook payload
  if (typeof payload.tool_name === "string") return payload.tool_name;
  // PreToolUse matcher context often carries the tool name
  if (typeof payload.tool === "string") return payload.tool;
  return "unknown";
}

function extractInputExcerpt(payload: HookPayload): string {
  const input = payload.tool_input as Record<string, unknown> | undefined;
  if (!input) return "";

  // Common tool input patterns
  if (typeof input.command === "string") return input.command.slice(0, 200);
  if (typeof input.file_path === "string") return input.file_path;
  if (typeof input.pattern === "string") return input.pattern;
  if (typeof input.query === "string") return input.query.slice(0, 200);

  return JSON.stringify(input).slice(0, 200);
}

function generateToolUseId(payload: HookPayload, observedAt: string): string {
  const toolName = extractToolName(payload);
  const ts = new Date(observedAt).getTime();
  return `${payload.session_id}:${toolName}:${ts}`;
}

function categorizeToolName(toolName: string): string {
  const lower = toolName.toLowerCase();
  if (lower === "bash") return "bash";
  if (lower === "read") return "read";
  if (lower === "write") return "write";
  if (lower === "edit") return "edit";
  if (lower.includes("web") || lower.includes("fetch")) return "web";
  if (lower === "agent") return "agent";
  if (lower.includes("task")) return "task";
  if (lower.startsWith("mcp")) return "mcp";
  if (lower === "glob" || lower === "grep") return "read";
  return "other";
}

/**
 * Normalize tool-related hook events:
 * - PreToolUse → tool.requested
 * - PostToolUse → tool.succeeded
 * - PostToolUseFailure → tool.failed
 */
export function normalizeToolEvent(payload: HookPayload): NormalizedEvent {
  const hookName = payload.hook_event_name;
  const toolName = extractToolName(payload);
  const observedAt = typeof payload.observed_at === "string"
    ? payload.observed_at
    : new Date().toISOString();

  switch (hookName) {
    case "PreToolUse": {
      const inputExcerpt = extractInputExcerpt(payload);
      const toolUseId = generateToolUseId(payload, observedAt);

      return {
        eventType: "tool.requested",
        eventCategory: "tool",
        sessionId: payload.session_id,
        toolUseId,
        agentId: payload.agent_id,
        status: "requested",
        severity: "info",
        payloadJson: JSON.stringify({
          tool_name: toolName,
          tool_category: categorizeToolName(toolName),
          input_excerpt: inputExcerpt,
          tool_input: payload.tool_input,
        }),
        searchText: `${toolName} ${inputExcerpt}`.slice(0, 300),
      };
    }

    case "PostToolUse": {
      return {
        eventType: "tool.succeeded",
        eventCategory: "tool",
        sessionId: payload.session_id,
        toolUseId: undefined, // will be correlated by projection
        agentId: payload.agent_id,
        status: "succeeded",
        severity: "info",
        payloadJson: JSON.stringify({
          tool_name: toolName,
          tool_category: categorizeToolName(toolName),
        }),
        searchText: `${toolName} succeeded`,
      };
    }

    case "PostToolUseFailure": {
      const errorMsg = typeof payload.error === "string"
        ? payload.error
        : typeof payload.stderr === "string"
          ? payload.stderr.slice(0, 500)
          : "";

      return {
        eventType: "tool.failed",
        eventCategory: "tool",
        sessionId: payload.session_id,
        toolUseId: undefined,
        agentId: payload.agent_id,
        status: "failed",
        severity: "error",
        payloadJson: JSON.stringify({
          tool_name: toolName,
          tool_category: categorizeToolName(toolName),
          error_message: errorMsg,
        }),
        searchText: `${toolName} failed ${errorMsg}`.slice(0, 300),
      };
    }

    default:
      throw new Error(`Unknown tool hook event: ${hookName}`);
  }
}
