"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SessionDetailClient } from "@/components/session/session-detail-client";
import type { SessionDetailResponse } from "@/lib/types";
import Link from "next/link";

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
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Dashboard
        </Link>
        <div className="text-center py-12 text-muted-foreground">Session not found</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Dashboard
        </Link>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Dashboard
        </Link>
      </div>
      <SessionDetailClient sessionId={sessionId} initialData={data} />
    </div>
  );
}
