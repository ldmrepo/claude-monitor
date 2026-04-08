"use client";

import { useEffect, useState } from "react";
import { ToolTimeline } from "@/components/timeline/tool-timeline";
import type { ToolExecRow } from "@/lib/types";
import Link from "next/link";

export default function ToolsPage() {
  const [tools, setTools] = useState<ToolExecRow[]>([]);

  useEffect(() => {
    fetch("/api/tools")
      .then((r) => r.json())
      .then(setTools)
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">Tool Timeline</h1>
      <ToolTimeline initialTools={tools} />
    </div>
  );
}
