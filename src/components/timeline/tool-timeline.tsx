"use client";

import { useEffect, useState } from "react";
import { useSSE } from "@/hooks/use-sse";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { TimeAgo } from "@/components/shared/time-ago";
import Link from "next/link";

interface ToolExec {
  toolExecutionId: string;
  sessionId: string;
  toolName: string;
  currentState: string;
  inputExcerpt: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  requestedAt: string | null;
}

const STATES = ["all", "running", "succeeded", "failed", "requested", "denied"];

export function ToolTimeline({ initialTools }: { initialTools: ToolExec[] }) {
  const [tools, setTools] = useState<ToolExec[]>(initialTools);
  const [filter, setFilter] = useState("all");
  const refreshCount = useSSE("tool");

  // Fetch on mount to ensure data is loaded
  useEffect(() => {
    fetch("/api/tools")
      .then((r) => r.json())
      .then((d) => setTools(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (refreshCount === 0) return;
    const params = filter !== "all" ? `?state=${filter}` : "";
    fetch(`/api/tools${params}`)
      .then((r) => r.json())
      .then((d) => setTools(d))
      .catch(() => {});
  }, [refreshCount, filter]);

  // Client-side filter for initial render
  const filtered = filter === "all" ? tools : tools.filter((t) => t.currentState === filter);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {STATES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              filter === s
                ? "bg-foreground text-background"
                : "hover:bg-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          No tool executions{filter !== "all" ? ` with state "${filter}"` : ""}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tool</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Input / Error</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.toolExecutionId}>
                <TableCell className="font-mono text-sm font-medium">{t.toolName}</TableCell>
                <TableCell>
                  <StatusBadge state={t.currentState} />
                </TableCell>
                <TableCell className="font-mono text-sm">
                  <Link
                    href={`/sessions/${t.sessionId}`}
                    className="hover:underline text-blue-400"
                  >
                    {t.sessionId.slice(0, 8)}...
                  </Link>
                </TableCell>
                <TableCell className="text-sm max-w-[250px] truncate">
                  {t.errorMessage || t.inputExcerpt || "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {t.durationMs != null ? `${t.durationMs}ms` : "—"}
                </TableCell>
                <TableCell>
                  <TimeAgo date={t.requestedAt} className="text-sm" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
