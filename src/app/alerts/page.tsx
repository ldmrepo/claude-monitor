"use client";

import { useEffect, useState } from "react";
import { AlertList } from "@/components/alerts/alert-list";
import type { AlertRow } from "@/lib/types";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);

  useEffect(() => {
    fetch("/api/alerts").then((r) => r.json()).then(setAlerts).catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-lg font-semibold mb-4">Alerts</h1>
      <AlertList initialAlerts={alerts} />
    </div>
  );
}
