"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SessionDetailClient } from "@/components/session/session-detail-client";
import type { SessionDetailResponse } from "@/lib/types";

export default function SessionDetailPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [data, setData] = useState<SessionDetailResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((d) => setData(d))
      .catch(() => setError(true));
  }, [sessionId]);

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">Session not found</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex gap-3 py-12 justify-center" aria-busy="true" aria-label="Loading session">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <SessionDetailClient sessionId={sessionId} initialData={data} />
    </div>
  );
}
