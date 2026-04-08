interface StatsCardsProps {
  activeSessions: number;
  runningTools: number;
  openAlerts: number;
  totalEvents: number;
}

const stats = (props: StatsCardsProps) => [
  { title: "Active Sessions", value: props.activeSessions, dot: "bg-emerald-500" },
  { title: "Running Tools", value: props.runningTools, dot: "bg-blue-500" },
  { title: "Open Alerts", value: props.openAlerts, dot: props.openAlerts > 0 ? "bg-red-500" : "bg-zinc-400" },
  { title: "Total Events", value: props.totalEvents, dot: "bg-zinc-400" },
];

export function StatsCards(props: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats(props).map((s) => (
        <div key={s.title} className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
            <span className="text-sm text-muted-foreground">{s.title}</span>
          </div>
          <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
