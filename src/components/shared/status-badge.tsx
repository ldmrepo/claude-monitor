import { Badge } from "@/components/ui/badge";

const STATE_COLORS: Record<string, string> = {
  // Session states
  initializing: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  running: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  idle: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  compacting: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  stopped: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  failed: "bg-red-500/15 text-red-300 border-red-500/30",
  stale: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  // Task states
  pending: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  in_progress: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  blocked: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  // Tool states
  requested: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  succeeded: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  denied: "bg-red-500/15 text-red-300 border-red-500/30",
  deferred: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  interrupted: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  // Alert
  open: "bg-red-500/15 text-red-300 border-red-500/30",
  acknowledged: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  cleared: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  // Agent
  starting: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

interface StatusBadgeProps {
  state: string;
  className?: string;
}

export function StatusBadge({ state, className }: StatusBadgeProps) {
  const colorClass = STATE_COLORS[state] || "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";

  return (
    <Badge variant="outline" className={`${colorClass} font-medium text-sm ${className || ""}`}>
      {state}
    </Badge>
  );
}
