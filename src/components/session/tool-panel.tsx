import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { TimeAgo } from "@/components/shared/time-ago";
import type { ToolExecRow } from "@/lib/types";

export function ToolPanel({ tools }: { tools: ToolExecRow[] }) {
  if (tools.length === 0) {
    return <div className="text-center py-8 text-sm">No tool executions yet</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tool</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Input</TableHead>
          <TableHead className="text-right">Duration</TableHead>
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tools.map((t) => (
          <TableRow key={t.toolExecutionId}>
            <TableCell className="font-mono text-sm font-medium">{t.toolName}</TableCell>
            <TableCell>
              <StatusBadge state={t.currentState} />
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
  );
}
