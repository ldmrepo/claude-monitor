import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { TimeAgo } from "@/components/shared/time-ago";
import type { SessionRow } from "@/lib/types";

export function SessionHeader({ session }: { session: SessionRow }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold font-mono">{session.sessionId}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {session.workingDirectory || "No directory"}
            </p>
          </div>
          <StatusBadge state={session.currentState} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Started</span>
            <p className="font-medium">
              <TimeAgo date={session.startedAt} />
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Last Activity</span>
            <p className="font-medium">
              <TimeAgo date={session.lastActivityAt} />
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Permission</span>
            <p className="font-medium">{session.permissionMode || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Events</span>
            <p className="font-medium tabular-nums">{session.eventCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 text-sm mt-4">
          <div>
            <span className="text-muted-foreground">Tools</span>
            <p className="font-medium tabular-nums">{session.toolCallCount}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Errors</span>
            <p className="font-medium tabular-nums text-red-600">{session.errorCount}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Tasks</span>
            <p className="font-medium tabular-nums">{session.activeTaskCount}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Agents</span>
            <p className="font-medium tabular-nums">{session.activeAgentCount}</p>
          </div>
        </div>

        {session.lastAssistantMessageExcerpt && (
          <div className="mt-4 p-3 bg-muted rounded-md text-sm">
            <span className="text-muted-foreground text-xs block mb-1">Last Message</span>
            {session.lastAssistantMessageExcerpt}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
