import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { TimeAgo } from "@/components/shared/time-ago";

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

interface ActiveSessionsListProps {
  sessions: Session[];
}

export function ActiveSessionsList({ sessions }: ActiveSessionsListProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        No sessions yet. Start a Claude Code session with hooks configured to see data here.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Session</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Directory</TableHead>
          <TableHead className="text-right">Events</TableHead>
          <TableHead className="text-right">Tools</TableHead>
          <TableHead className="text-right">Errors</TableHead>
          <TableHead>Last Activity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((s) => (
          <TableRow key={s.sessionId}>
            <TableCell className="font-mono text-sm">
              <Link href={`/sessions/${s.sessionId}`} className="hover:underline text-blue-400">
                {s.sessionId.slice(0, 12)}...
              </Link>
            </TableCell>
            <TableCell>
              <StatusBadge state={s.currentState} />
            </TableCell>
            <TableCell className="text-sm max-w-[200px] truncate">
              {s.workingDirectory || "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums">{s.eventCount}</TableCell>
            <TableCell className="text-right tabular-nums">{s.toolCallCount}</TableCell>
            <TableCell className="text-right tabular-nums">{s.errorCount}</TableCell>
            <TableCell>
              <TimeAgo date={s.lastActivityAt} className="text-sm" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
