import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { TimeAgo } from "@/components/shared/time-ago";
import type { TaskRow } from "@/lib/types";

export function TaskPanel({ tasks }: { tasks: TaskRow[] }) {
  if (tasks.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">No tasks yet</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Completed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((t) => (
          <TableRow key={t.taskId}>
            <TableCell className="text-sm">
              {t.taskSubject || <span className="font-mono text-xs">{t.taskId.slice(0, 16)}</span>}
            </TableCell>
            <TableCell>
              <StatusBadge state={t.currentState} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {t.assigneeName || "—"}
            </TableCell>
            <TableCell>
              <TimeAgo date={t.createdAt} className="text-xs text-muted-foreground" />
            </TableCell>
            <TableCell>
              {t.completedAt ? (
                <TimeAgo date={t.completedAt} className="text-xs text-muted-foreground" />
              ) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
