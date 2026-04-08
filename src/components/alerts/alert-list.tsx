"use client";

import { useEffect, useState } from "react";
import { useSSE } from "@/hooks/use-sse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TimeAgo } from "@/components/shared/time-ago";

interface Alert {
  alertId: string;
  alertType: string;
  alertScopeType: string;
  alertScopeId: string | null;
  title: string;
  message: string | null;
  severity: string;
  status: string;
  raisedAt: string;
  acknowledgedAt: string | null;
  clearedAt: string | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-600 text-white",
  error: "bg-red-500/15 text-red-300",
  warning: "bg-amber-500/15 text-amber-300",
  info: "bg-blue-500/15 text-blue-300",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-500/15 text-red-300 border-red-500/30",
  acknowledged: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  cleared: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

export function AlertList({ initialAlerts }: { initialAlerts: Alert[] }) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [filter, setFilter] = useState<"all" | "open" | "cleared">("all");
  const refreshCount = useSSE("alert");

  useEffect(() => {
    if (refreshCount === 0) return;
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => setAlerts(d))
      .catch(() => {});
  }, [refreshCount]);

  const filtered = filter === "all"
    ? alerts
    : alerts.filter((a) => filter === "open" ? a.status === "open" || a.status === "acknowledged" : a.status === "cleared");

  const openCount = alerts.filter((a) => a.status === "open").length;

  async function handleAcknowledge(alertId: string) {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId, action: "acknowledge" }),
    });
    // Refresh
    const res = await fetch("/api/alerts");
    setAlerts(await res.json());
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-2">
          {(["all", "open", "cleared"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                filter === f ? "bg-foreground text-background" : "hover:bg-muted"
              }`}
            >
              {f} {f === "open" && openCount > 0 ? `(${openCount})` : ""}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          No alerts{filter !== "all" ? ` with status "${filter}"` : ""}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Raised</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.alertId}>
                <TableCell>
                  <Badge className={SEVERITY_COLORS[a.severity] || ""}>
                    {a.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_COLORS[a.status] || ""}>
                    {a.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-sm">{a.title}</TableCell>
                <TableCell className="text-sm max-w-[250px] truncate">
                  {a.message || "—"}
                </TableCell>
                <TableCell className="text-sm font-mono">
                  {a.alertScopeId?.slice(0, 12) || "—"}
                </TableCell>
                <TableCell>
                  <TimeAgo date={a.raisedAt} className="text-sm" />
                </TableCell>
                <TableCell>
                  {a.status === "open" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledge(a.alertId)}
                      className="text-sm h-8"
                    >
                      Ack
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
