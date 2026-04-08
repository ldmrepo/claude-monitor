"use client";

import { useEffect, useState } from "react";
import { ToolTimeline } from "@/components/timeline/tool-timeline";
import type { ToolExecRow } from "@/lib/types";

export default function ToolsPage() {
  const [tools, setTools] = useState<ToolExecRow[]>([]);

  useEffect(() => {
    fetch("/api/tools").then((r) => r.json()).then(setTools).catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-lg font-semibold mb-4">Tool Timeline</h1>
      <ToolTimeline initialTools={tools} />
    </div>
  );
}
