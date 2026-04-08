"use client";

import { useEffect, useState } from "react";

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";

  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";
  if (diffMs < 5000) return "just now";
  if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s ago`;
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
  return `${Math.floor(diffMs / 86400000)}d ago`;
}

interface TimeAgoProps {
  date: string | null;
  className?: string;
}

export function TimeAgo({ date, className }: TimeAgoProps) {
  // Initialize with empty to avoid hydration mismatch (SSR time != client time)
  const [text, setText] = useState("");

  useEffect(() => {
    setText(formatTimeAgo(date));
    const interval = setInterval(() => setText(formatTimeAgo(date)), 10000);
    return () => clearInterval(interval);
  }, [date]);

  return (
    <span className={className} title={date || undefined} suppressHydrationWarning>
      {text}
    </span>
  );
}
