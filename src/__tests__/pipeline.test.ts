import { describe, it, expect, beforeEach } from "vitest";
import { processHookEvent } from "@/server/pipeline";
import { db, ensureMigrated } from "@/db/init";
import { rawEvents, events, sessionCurrent, toolExecCurrent, taskCurrent, agentCurrent } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

beforeEach(() => {
  ensureMigrated();
  // Clear all tables
  db.delete(agentCurrent).run();
  db.delete(taskCurrent).run();
  db.delete(toolExecCurrent).run();
  db.delete(sessionCurrent).run();
  db.delete(events).run();
  db.delete(rawEvents).run();
});

describe("processHookEvent", () => {
  it("rejects invalid payload", () => {
    const result = processHookEvent(null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("not an object");
  });

  it("rejects missing session_id", () => {
    const result = processHookEvent({ hook_event_name: "SessionStart" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("session_id");
  });

  it("rejects missing hook_event_name", () => {
    const result = processHookEvent({ session_id: "s1" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("hook_event_name");
  });

  it("stores raw event and normalized event on valid payload", () => {
    const result = processHookEvent({
      session_id: "s1",
      hook_event_name: "SessionStart",
      cwd: "/tmp",
      source: "startup",
    });

    expect(result.success).toBe(true);
    expect(result.rawEventId).toBeDefined();
    expect(result.eventId).toBeDefined();

    const rawCount = db.select({ c: sql<number>`count(*)` }).from(rawEvents).get();
    expect(rawCount?.c).toBe(1);

    const eventCount = db.select({ c: sql<number>`count(*)` }).from(events).get();
    expect(eventCount?.c).toBe(1);
  });

  it("deduplicates identical events", () => {
    const payload = {
      session_id: "s1",
      hook_event_name: "SessionStart",
      cwd: "/tmp",
      source: "startup",
    };

    const r1 = processHookEvent(payload);
    const r2 = processHookEvent(payload);

    expect(r1.success).toBe(true);
    expect(r1.isDuplicate).toBeFalsy();
    expect(r2.success).toBe(true);
    expect(r2.isDuplicate).toBe(true);

    const rawCount = db.select({ c: sql<number>`count(*)` }).from(rawEvents).get();
    expect(rawCount?.c).toBe(1);
  });
});

describe("Session normalizer + projection", () => {
  it("creates session on SessionStart", () => {
    processHookEvent({
      session_id: "s1",
      hook_event_name: "SessionStart",
      cwd: "/work/project",
      source: "startup",
      permission_mode: "default",
    });

    const session = db.select().from(sessionCurrent).where(eq(sessionCurrent.sessionId, "s1")).get();
    expect(session).toBeDefined();
    expect(session!.currentState).toBe("running");
    expect(session!.workingDirectory).toBe("/work/project");
    expect(session!.eventCount).toBe(1);
  });

  it("transitions to stopped on Stop", () => {
    processHookEvent({ session_id: "s1", hook_event_name: "SessionStart", source: "startup" });
    processHookEvent({ session_id: "s1", hook_event_name: "Stop", last_assistant_message: "Done." });

    const session = db.select().from(sessionCurrent).where(eq(sessionCurrent.sessionId, "s1")).get();
    expect(session!.currentState).toBe("stopped");
    expect(session!.lastAssistantMessageExcerpt).toBe("Done.");
  });

  it("prevents regression from stopped to running on late events", () => {
    processHookEvent({ session_id: "s1", hook_event_name: "SessionStart", source: "startup" });
    processHookEvent({ session_id: "s1", hook_event_name: "Stop" });

    // A late tool event should not change state back to running
    processHookEvent({ session_id: "s1", hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "echo hi" } });

    const session = db.select().from(sessionCurrent).where(eq(sessionCurrent.sessionId, "s1")).get();
    expect(session!.currentState).toBe("stopped");
    // But event count should still increment
    expect(session!.eventCount).toBe(3);
  });

  it("allows new session start after stop", () => {
    processHookEvent({ session_id: "s1", hook_event_name: "SessionStart", source: "startup" });
    processHookEvent({ session_id: "s1", hook_event_name: "Stop" });
    processHookEvent({ session_id: "s1", hook_event_name: "SessionStart", source: "resume" });

    const session = db.select().from(sessionCurrent).where(eq(sessionCurrent.sessionId, "s1")).get();
    expect(session!.currentState).toBe("running");
  });
});

describe("Tool normalizer + projection", () => {
  beforeEach(() => {
    processHookEvent({ session_id: "s1", hook_event_name: "SessionStart", source: "startup" });
  });

  it("creates tool execution on PreToolUse", () => {
    processHookEvent({ session_id: "s1", hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "npm test" } });

    const tools = db.select().from(toolExecCurrent).where(eq(toolExecCurrent.sessionId, "s1")).all();
    expect(tools).toHaveLength(1);
    expect(tools[0].toolName).toBe("Bash");
    expect(tools[0].currentState).toBe("running");
    expect(tools[0].inputExcerpt).toBe("npm test");
  });

  it("correlates PostToolUse to running tool", () => {
    processHookEvent({ session_id: "s1", hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { file_path: "/src/x.ts" } });
    processHookEvent({ session_id: "s1", hook_event_name: "PostToolUse", tool_name: "Read" });

    const tools = db.select().from(toolExecCurrent).where(eq(toolExecCurrent.sessionId, "s1")).all();
    expect(tools).toHaveLength(1);
    expect(tools[0].currentState).toBe("succeeded");
    expect(tools[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it("marks tool as failed on PostToolUseFailure", () => {
    processHookEvent({ session_id: "s1", hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: "/x.ts" } });
    processHookEvent({ session_id: "s1", hook_event_name: "PostToolUseFailure", tool_name: "Edit", error: "old_string not found" });

    const tools = db.select().from(toolExecCurrent).where(eq(toolExecCurrent.sessionId, "s1")).all();
    expect(tools[0].currentState).toBe("failed");
    expect(tools[0].errorMessage).toBe("old_string not found");
  });

  it("increments session counters", () => {
    processHookEvent({ session_id: "s1", hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "ls" } });
    processHookEvent({ session_id: "s1", hook_event_name: "PostToolUse", tool_name: "Bash" });
    processHookEvent({ session_id: "s1", hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: "/x" } });
    processHookEvent({ session_id: "s1", hook_event_name: "PostToolUseFailure", tool_name: "Edit", error: "fail" });

    const session = db.select().from(sessionCurrent).where(eq(sessionCurrent.sessionId, "s1")).get();
    expect(session!.toolCallCount).toBe(2);
    expect(session!.errorCount).toBe(1);
  });
});

describe("Task normalizer + projection", () => {
  beforeEach(() => {
    processHookEvent({ session_id: "s1", hook_event_name: "SessionStart", source: "startup" });
  });

  it("creates task on TaskCreated", () => {
    processHookEvent({ session_id: "s1", hook_event_name: "TaskCreated", task_id: "t1", subject: "Build auth" });

    const tasks = db.select().from(taskCurrent).where(eq(taskCurrent.sessionId, "s1")).all();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].taskSubject).toBe("Build auth");
    expect(tasks[0].currentState).toBe("pending");
  });

  it("completes task on TaskCompleted", () => {
    processHookEvent({ session_id: "s1", hook_event_name: "TaskCreated", task_id: "t1", subject: "Build auth" });
    processHookEvent({ session_id: "s1", hook_event_name: "TaskCompleted", task_id: "t1" });

    const task = db.select().from(taskCurrent).where(eq(taskCurrent.taskId, "t1")).get();
    expect(task!.currentState).toBe("completed");
  });

  it("tracks session active task count", () => {
    processHookEvent({ session_id: "s1", hook_event_name: "TaskCreated", task_id: "t1", subject: "A" });
    processHookEvent({ session_id: "s1", hook_event_name: "TaskCreated", task_id: "t2", subject: "B" });

    let session = db.select().from(sessionCurrent).where(eq(sessionCurrent.sessionId, "s1")).get();
    expect(session!.activeTaskCount).toBe(2);

    processHookEvent({ session_id: "s1", hook_event_name: "TaskCompleted", task_id: "t1" });
    session = db.select().from(sessionCurrent).where(eq(sessionCurrent.sessionId, "s1")).get();
    expect(session!.activeTaskCount).toBe(1);
  });
});

describe("Agent normalizer + projection", () => {
  beforeEach(() => {
    processHookEvent({ session_id: "s1", hook_event_name: "SessionStart", source: "startup" });
  });

  it("creates agent on SubagentStart", () => {
    processHookEvent({ session_id: "s1", hook_event_name: "SubagentStart", agent_id: "a1", agent_type: "Explore" });

    const agents = db.select().from(agentCurrent).where(eq(agentCurrent.sessionId, "s1")).all();
    expect(agents).toHaveLength(1);
    expect(agents[0].agentType).toBe("Explore");
    expect(agents[0].currentState).toBe("running");
  });

  it("stops agent on SubagentStop", () => {
    processHookEvent({ session_id: "s1", hook_event_name: "SubagentStart", agent_id: "a1", agent_type: "Explore" });
    processHookEvent({ session_id: "s1", hook_event_name: "SubagentStop", agent_id: "a1", agent_type: "Explore" });

    const agent = db.select().from(agentCurrent).where(eq(agentCurrent.agentId, "a1")).get();
    expect(agent!.currentState).toBe("stopped");
  });

  it("tracks session active agent count", () => {
    processHookEvent({ session_id: "s1", hook_event_name: "SubagentStart", agent_id: "a1", agent_type: "Explore" });
    let session = db.select().from(sessionCurrent).where(eq(sessionCurrent.sessionId, "s1")).get();
    expect(session!.activeAgentCount).toBe(1);

    processHookEvent({ session_id: "s1", hook_event_name: "SubagentStop", agent_id: "a1", agent_type: "Explore" });
    session = db.select().from(sessionCurrent).where(eq(sessionCurrent.sessionId, "s1")).get();
    expect(session!.activeAgentCount).toBe(0);
  });
});
