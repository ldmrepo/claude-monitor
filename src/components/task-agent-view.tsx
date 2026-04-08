"use client";

import { useEffect, useState } from "react";
import { useSSEMulti } from "@/hooks/use-sse";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskPanel } from "@/components/session/task-panel";
import { AgentPanel } from "@/components/session/agent-panel";
import type { TaskRow, AgentRow } from "@/lib/types";

export function TaskAgentView({
  initialTasks,
  initialAgents,
}: {
  initialTasks: TaskRow[];
  initialAgents: AgentRow[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [agents, setAgents] = useState(initialAgents);
  const refreshCount = useSSEMulti(["task", "agent"]);

  useEffect(() => {
    if (refreshCount === 0) return;

    Promise.all([
      fetch("/api/tasks").then((r) => r.json()),
      fetch("/api/agents").then((r) => r.json()),
    ])
      .then(([t, a]: [TaskRow[], AgentRow[]]) => {
        setTasks(t);
        setAgents(a);
      })
      .catch(() => {});
  }, [refreshCount]);

  return (
    <Tabs defaultValue="tasks">
      <TabsList>
        <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
        <TabsTrigger value="agents">Agents ({agents.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="tasks">
        <TaskPanel tasks={tasks} />
      </TabsContent>

      <TabsContent value="agents">
        <AgentPanel agents={agents} />
      </TabsContent>
    </Tabs>
  );
}
