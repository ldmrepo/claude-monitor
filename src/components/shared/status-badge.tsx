import { Badge } from "@/components/ui/badge";

const STATE_COLORS: Record<string, string> = {
  // Session states
  initializing: "bg-blue-500/15 text-blue-700 border-blue-200",
  running: "bg-green-500/15 text-green-700 border-green-200",
  idle: "bg-yellow-500/15 text-yellow-700 border-yellow-200",
  compacting: "bg-purple-500/15 text-purple-700 border-purple-200",
  stopped: "bg-zinc-500/15 text-zinc-500 border-zinc-200",
  failed: "bg-red-500/15 text-red-700 border-red-200",
  stale: "bg-orange-500/15 text-orange-700 border-orange-200",
  // Task states
  pending: "bg-zinc-500/15 text-zinc-500 border-zinc-200",
  in_progress: "bg-blue-500/15 text-blue-700 border-blue-200",
  blocked: "bg-orange-500/15 text-orange-700 border-orange-200",
  completed: "bg-green-500/15 text-green-700 border-green-200",
  cancelled: "bg-zinc-500/15 text-zinc-500 border-zinc-200",
  // Tool states
  requested: "bg-blue-500/15 text-blue-700 border-blue-200",
  succeeded: "bg-green-500/15 text-green-700 border-green-200",
  denied: "bg-red-500/15 text-red-700 border-red-200",
  deferred: "bg-yellow-500/15 text-yellow-700 border-yellow-200",
  interrupted: "bg-orange-500/15 text-orange-700 border-orange-200",
  // Alert
  open: "bg-red-500/15 text-red-700 border-red-200",
  acknowledged: "bg-yellow-500/15 text-yellow-700 border-yellow-200",
  cleared: "bg-green-500/15 text-green-700 border-green-200",
  // Agent
  starting: "bg-blue-500/15 text-blue-700 border-blue-200",
};

interface StatusBadgeProps {
  state: string;
  className?: string;
}

export function StatusBadge({ state, className }: StatusBadgeProps) {
  const colorClass = STATE_COLORS[state] || "bg-zinc-500/15 text-zinc-500 border-zinc-200";

  return (
    <Badge variant="outline" className={`${colorClass} font-medium text-xs ${className || ""}`}>
      {state}
    </Badge>
  );
}
