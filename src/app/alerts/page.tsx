"use client";

import { useEffect, useState } from "react";
import { AlertList } from "@/components/alerts/alert-list";
import type { AlertRow } from "@/lib/types";
import Link from "next/link";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then(setAlerts)
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">Alerts</h1>
      <AlertList initialAlerts={alerts} />
    </div>
  );
}
