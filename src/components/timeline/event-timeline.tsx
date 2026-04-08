"use client";

import { useEffect, useState } from "react";
import { useSSEMulti } from "@/hooks/use-sse";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TimeAgo } from "@/components/shared/time-ago";

interface Event {
  id: string;
  eventType: string;
  eventCategory: string;
  sessionId: string | null;
  severity: string | null;
  searchText: string | null;
  observedAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  session: "bg-blue-500/15 text-blue-300",
  tool: "bg-purple-500/15 text-purple-300",
  task: "bg-emerald-500/15 text-emerald-300",
  agent: "bg-orange-500/15 text-orange-300",
  alert: "bg-red-500/15 text-red-300",
  prompt: "bg-cyan-500/15 text-cyan-300",
  compact: "bg-zinc-500/15 text-zinc-300",
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "text-zinc-300",
  warning: "text-amber-400",
  error: "text-red-400",
  critical: "text-red-300 font-bold",
};

const CATEGORIES = ["all", "session", "tool", "task", "agent", "alert"];
const TIME_RANGES = [
  { label: "1h", ms: 3600000 },
  { label: "6h", ms: 21600000 },
  { label: "24h", ms: 86400000 },
  { label: "All", ms: 0 },
];

export function EventTimeline({ initialEvents }: { initialEvents: Event[] }) {
  const [eventList, setEventList] = useState<Event[]>(initialEvents);
  const [category, setCategory] = useState("all");
  const [timeRange, setTimeRange] = useState(0); // 0 = all
  const refreshCount = useSSEMulti(["session", "tool", "task", "agent", "alert"]);

  useEffect(() => {
    if (refreshCount === 0) return;
    fetchEvents();
  }, [refreshCount]);

  useEffect(() => {
    fetchEvents();
  }, [category, timeRange]);

  function fetchEvents() {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (timeRange > 0) {
      params.set("since", new Date(Date.now() - timeRange).toISOString());
    }
    params.set("limit", "100");

    fetch(`/api/events?${params}`)
      .then((r) => r.json())
      .then((d) => setEventList(d))
      .catch(() => {});
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                category === c ? "bg-foreground text-background" : "hover:bg-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.label}
              onClick={() => setTimeRange(tr.ms)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                timeRange === tr.ms ? "bg-foreground text-background" : "hover:bg-muted"
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {eventList.length === 0 ? (
        <div className="text-center py-12">No events found</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventList.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <TimeAgo date={e.observedAt} className="text-sm" />
                </TableCell>
                <TableCell>
                  <Badge className={`text-sm ${CATEGORY_COLORS[e.eventCategory] || ""}`}>
                    {e.eventCategory}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{e.eventType}</TableCell>
                <TableCell className="font-mono text-sm">
                  {e.sessionId?.slice(0, 8) || "—"}
                </TableCell>
                <TableCell>
                  <span className={`text-sm ${SEVERITY_COLORS[e.severity || "info"] || ""}`}>
                    {e.severity || "info"}
                  </span>
                </TableCell>
                <TableCell className="text-sm max-w-[250px] truncate">
                  {e.searchText || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
