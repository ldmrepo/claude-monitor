"use client";

import { useEffect, useState } from "react";
import { TaskAgentView } from "@/components/task-agent-view";
import type { TaskRow, AgentRow } from "@/lib/types";
import Link from "next/link";

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then((r) => r.json()),
      fetch("/api/agents").then((r) => r.json()),
    ])
      .then(([t, a]) => { setTasks(t); setAgents(a); })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">Tasks & Agents</h1>
      <TaskAgentView initialTasks={tasks} initialAgents={agents} />
    </div>
  );
}
