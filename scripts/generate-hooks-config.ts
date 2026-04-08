#!/usr/bin/env npx tsx
/**
 * Generate Claude Code hook configuration for Claude Vault.
 * Usage: npx tsx scripts/generate-hooks-config.ts [port]
 * Output: JSON snippet to add to .claude/settings.json
 */

const port = process.argv[2] || "3000";
const baseUrl = `http://127.0.0.1:${port}`;

const hooks: Record<string, Array<{ matcher?: string; hooks: Array<{ type: string; url: string }> }>> = {
  SessionStart: [
    { hooks: [{ type: "http", url: `${baseUrl}/api/hooks/session-start` }] },
  ],
  PreToolUse: [
    { matcher: ".*", hooks: [{ type: "http", url: `${baseUrl}/api/hooks/pre-tool` }] },
  ],
  PostToolUse: [
    { matcher: ".*", hooks: [{ type: "http", url: `${baseUrl}/api/hooks/post-tool` }] },
  ],
  PostToolUseFailure: [
    { matcher: ".*", hooks: [{ type: "http", url: `${baseUrl}/api/hooks/post-tool-failure` }] },
  ],
  SubagentStart: [
    { hooks: [{ type: "http", url: `${baseUrl}/api/hooks/subagent-start` }] },
  ],
  SubagentStop: [
    { hooks: [{ type: "http", url: `${baseUrl}/api/hooks/subagent-stop` }] },
  ],
  TaskCreated: [
    { hooks: [{ type: "http", url: `${baseUrl}/api/hooks/task-created` }] },
  ],
  TaskCompleted: [
    { hooks: [{ type: "http", url: `${baseUrl}/api/hooks/task-completed` }] },
  ],
  Stop: [
    { hooks: [{ type: "http", url: `${baseUrl}/api/hooks/stop` }] },
  ],
  SessionEnd: [
    { hooks: [{ type: "http", url: `${baseUrl}/api/hooks/session-end` }] },
  ],
};

const config = { hooks };

console.log(JSON.stringify(config, null, 2));
console.error(`\nGenerated hook config for Claude Vault at ${baseUrl}`);
console.error(`Add the above JSON to your .claude/settings.json file.`);
