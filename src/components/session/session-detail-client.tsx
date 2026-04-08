"use client";

import { useEffect, useState } from "react";
import { useSSEMulti } from "@/hooks/use-sse";
import { SessionHeader } from "./session-header";
import { ToolPanel } from "./tool-panel";
import { TaskPanel } from "./task-panel";
import { AgentPanel } from "./agent-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SessionDetailResponse } from "@/lib/types";

export function SessionDetailClient({
  sessionId,
  initialData,
}: {
  sessionId: string;
  initialData: SessionDetailResponse;
}) {
  const [data, setData] = useState(initialData);
  const refreshCount = useSSEMulti(["session", "tool", "task", "agent"]);

  useEffect(() => {
    if (refreshCount === 0) return;

    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d: SessionDetailResponse) => setData(d))
      .catch(() => {});
  }, [refreshCount, sessionId]);

  return (
    <div className="space-y-6">
      <SessionHeader session={data.session} />

      <Tabs defaultValue="tools">
        <TabsList>
          <TabsTrigger value="tools">
            Tools ({data.tools.length})
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks ({data.tasks.length})
          </TabsTrigger>
          <TabsTrigger value="agents">
            Agents ({data.agents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tools">
          <ToolPanel tools={data.tools} />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskPanel tasks={data.tasks} />
        </TabsContent>

        <TabsContent value="agents">
          <AgentPanel agents={data.agents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
