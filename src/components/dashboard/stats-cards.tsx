import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardsProps {
  activeSessions: number;
  runningTools: number;
  openAlerts: number;
  totalEvents: number;
}

export function StatsCards({ activeSessions, runningTools, openAlerts, totalEvents }: StatsCardsProps) {
  const stats = [
    { title: "Active Sessions", value: activeSessions, color: "text-green-600" },
    { title: "Running Tools", value: runningTools, color: "text-blue-600" },
    { title: "Open Alerts", value: openAlerts, color: openAlerts > 0 ? "text-red-600" : "text-zinc-500" },
    { title: "Total Events", value: totalEvents, color: "text-zinc-600" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
