"use client";

import { useEffect, useState } from "react";
import { EventTimeline } from "@/components/timeline/event-timeline";
import type { EventRow } from "@/lib/types";
import Link from "next/link";

export default function EventsPage() {
  const [eventList, setEventList] = useState<EventRow[]>([]);

  useEffect(() => {
    fetch("/api/events?limit=100")
      .then((r) => r.json())
      .then(setEventList)
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">Event Timeline</h1>
      <EventTimeline initialEvents={eventList} />
    </div>
  );
}
