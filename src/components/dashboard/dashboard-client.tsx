"use client";

import { useEffect, useState, useRef } from "react";
import { useSSEMulti } from "@/hooks/use-sse";
import { StatsCards } from "./stats-cards";
import { ActiveSessionsList } from "./active-sessions-list";

interface Session {
  sessionId: string;
  currentState: string;
  workingDirectory: string | null;
  lastActivityAt: string | null;
  eventCount: number;
  toolCallCount: number;
  errorCount: number;
  startedAt: string | null;
}

interface DashboardProps {
  initialSessions: Session[];
  initialOpenAlerts: number;
  initialRunningTools: number;
}

export function DashboardClient({ initialSessions, initialOpenAlerts, initialRunningTools }: DashboardProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [openAlerts, setOpenAlerts] = useState(initialOpenAlerts);
  const [runningTools, setRunningTools] = useState(initialRunningTools);
  const refreshCount = useSSEMulti(["session", "tool", "task", "agent", "alert"]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch on mount to ensure fresh data (SSR may have stale/empty initial data)
  useEffect(() => {
    fetchDashboardData();
  }, []);

  function fetchDashboardData() {
    Promise.all([
      fetch("/api/sessions").then((r) => r.json()),
      fetch("/api/alerts").then((r) => r.json()),
      fetch("/api/tools?state=running").then((r) => r.json()),
    ])
      .then(([s, a, t]) => {
        setSessions(s);
        setOpenAlerts(a.filter((x: { status: string }) => x.status === "open").length);
        setRunningTools(t.length);
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (refreshCount === 0) return;

    // Debounce: wait 500ms after last SSE event before fetching
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchDashboardData, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [refreshCount]);

  const activeSessions = sessions.filter(
    (s) => s.currentState !== "stopped" && s.currentState !== "failed"
  ).length;

  const totalEvents = sessions.reduce((sum, s) => sum + s.eventCount, 0);

  return (
    <div className="space-y-6">
      <StatsCards
        activeSessions={activeSessions}
        runningTools={runningTools}
        openAlerts={openAlerts}
        totalEvents={totalEvents}
      />
      <div>
        <h2 className="text-lg font-semibold mb-3">Sessions</h2>
        <ActiveSessionsList sessions={sessions} />
      </div>
    </div>
  );
}
