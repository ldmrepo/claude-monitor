"use client";

import { useEffect, useState } from "react";
import { EventTimeline } from "@/components/timeline/event-timeline";
import type { EventRow } from "@/lib/types";

export default function EventsPage() {
  const [eventList, setEventList] = useState<EventRow[]>([]);

  useEffect(() => {
    fetch("/api/events?limit=100").then((r) => r.json()).then(setEventList).catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-lg font-semibold mb-4">Event Timeline</h1>
      <EventTimeline initialEvents={eventList} />
    </div>
  );
}
