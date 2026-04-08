import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { TimeAgo } from "@/components/shared/time-ago";
import type { AgentRow } from "@/lib/types";

export function AgentPanel({ agents }: { agents: AgentRow[] }) {
  if (agents.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">No agents yet</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agent ID</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Last Activity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((a) => (
          <TableRow key={a.agentId}>
            <TableCell className="font-mono text-xs">{a.agentId.slice(0, 16)}</TableCell>
            <TableCell className="text-xs">{a.agentType || "—"}</TableCell>
            <TableCell>
              <StatusBadge state={a.currentState} />
            </TableCell>
            <TableCell>
              <TimeAgo date={a.startedAt} className="text-xs text-muted-foreground" />
            </TableCell>
            <TableCell>
              <TimeAgo date={a.lastActivityAt} className="text-xs text-muted-foreground" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
