#!/usr/bin/env npx tsx
/**
 * Simulate a full Claude Code session lifecycle.
 * Usage: npx tsx scripts/test-ingest.ts [port]
 */

const port = process.argv[2] || "3000";
const baseUrl = `http://127.0.0.1:${port}`;

async function post(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const status = res.status;
  const text = await res.text();
  console.log(`  ${path} → ${status}`);
  if (status >= 400) console.log(`    ${text}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const sessionId = `test-${Date.now()}`;
  console.log(`\nSimulating session: ${sessionId}\n`);

  // 1. Session Start
  console.log("1. Session Start");
  await post("/api/hooks/session-start", {
    session_id: sessionId,
    cwd: "/Users/dev/myproject",
    transcript_path: "/tmp/transcript.json",
    permission_mode: "default",
    hook_event_name: "SessionStart",
    source: "startup",
  });

  await sleep(200);

  // 2. Tool: Bash (npm test)
  console.log("2. Tool: Bash (npm test)");
  await post("/api/hooks/pre-tool", {
    session_id: sessionId,
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_input: { command: "npm test" },
  });
  await sleep(500);
  await post("/api/hooks/post-tool", {
    session_id: sessionId,
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
  });

  await sleep(200);

  // 3. Tool: Read (file)
  console.log("3. Tool: Read (src/index.ts)");
  await post("/api/hooks/pre-tool", {
    session_id: sessionId,
    hook_event_name: "PreToolUse",
    tool_name: "Read",
    tool_input: { file_path: "/src/index.ts" },
  });
  await sleep(300);
  await post("/api/hooks/post-tool", {
    session_id: sessionId,
    hook_event_name: "PostToolUse",
    tool_name: "Read",
  });

  await sleep(200);

  // 4. Tool: Edit (fails)
  console.log("4. Tool: Edit (failure)");
  await post("/api/hooks/pre-tool", {
    session_id: sessionId,
    hook_event_name: "PreToolUse",
    tool_name: "Edit",
    tool_input: { file_path: "/src/config.ts" },
  });
  await sleep(200);
  await post("/api/hooks/post-tool-failure", {
    session_id: sessionId,
    hook_event_name: "PostToolUseFailure",
    tool_name: "Edit",
    error: "old_string not found in file",
  });

  await sleep(200);

  // 5. Task Created
  console.log("5. Task: Create auth module");
  await post("/api/hooks/task-created", {
    session_id: sessionId,
    hook_event_name: "TaskCreated",
    task_id: "task-auth-001",
    subject: "Implement authentication module",
    description: "Add JWT-based auth with refresh tokens",
  });

  await sleep(200);

  // 6. Subagent Start
  console.log("6. Agent: Explore (code search)");
  await post("/api/hooks/subagent-start", {
    session_id: sessionId,
    hook_event_name: "SubagentStart",
    agent_id: "explore-agent-001",
    agent_type: "Explore",
  });
  await sleep(500);

  // 7. Tool by agent: Grep
  console.log("7. Tool: Grep (by agent)");
  await post("/api/hooks/pre-tool", {
    session_id: sessionId,
    hook_event_name: "PreToolUse",
    tool_name: "Grep",
    tool_input: { pattern: "authenticate", path: "/src" },
    agent_id: "explore-agent-001",
  });
  await sleep(300);
  await post("/api/hooks/post-tool", {
    session_id: sessionId,
    hook_event_name: "PostToolUse",
    tool_name: "Grep",
    agent_id: "explore-agent-001",
  });

  await sleep(200);

  // 8. Subagent Stop
  console.log("8. Agent: Explore stopped");
  await post("/api/hooks/subagent-stop", {
    session_id: sessionId,
    hook_event_name: "SubagentStop",
    agent_id: "explore-agent-001",
    agent_type: "Explore",
  });

  await sleep(200);

  // 9. Task Completed
  console.log("9. Task: Complete auth module");
  await post("/api/hooks/task-completed", {
    session_id: sessionId,
    hook_event_name: "TaskCompleted",
    task_id: "task-auth-001",
  });

  await sleep(200);

  // 10. Session Stop
  console.log("10. Session Stop");
  await post("/api/hooks/stop", {
    session_id: sessionId,
    hook_event_name: "Stop",
    last_assistant_message: "All tasks completed. Authentication module implemented with JWT and refresh tokens.",
  });

  await sleep(200);

  // 11. Session End
  console.log("11. Session End");
  await post("/api/hooks/session-end", {
    session_id: sessionId,
    hook_event_name: "SessionEnd",
    reason: "user_exit",
  });

  console.log("\nDone! Check the dashboard at http://localhost:" + port);

  // Verify
  console.log("\n--- Verification ---");
  const sessions = await fetch(`${baseUrl}/api/sessions`).then((r) => r.json());
  const s = sessions[0];
  console.log(`Session: ${s.sessionId} state=${s.currentState} events=${s.eventCount} tools=${s.toolCallCount} errors=${s.errorCount}`);

  const tools = await fetch(`${baseUrl}/api/tools`).then((r) => r.json());
  console.log(`Tools: ${tools.length} total`);
  for (const t of tools) {
    console.log(`  ${t.toolName.padEnd(8)} ${t.currentState.padEnd(10)} ${t.durationMs || 0}ms`);
  }

  const tasks = await fetch(`${baseUrl}/api/tasks`).then((r) => r.json());
  console.log(`Tasks: ${tasks.length} total`);
  for (const t of tasks) {
    console.log(`  ${(t.taskSubject || t.taskId).substring(0, 40)} → ${t.currentState}`);
  }

  const agents = await fetch(`${baseUrl}/api/agents`).then((r) => r.json());
  console.log(`Agents: ${agents.length} total`);
  for (const a of agents) {
    console.log(`  ${a.agentId.substring(0, 20)} (${a.agentType}) → ${a.currentState}`);
  }

  const eventList = await fetch(`${baseUrl}/api/events?limit=20`).then((r) => r.json());
  console.log(`Events: ${eventList.length} in timeline`);
}

main().catch(console.error);
