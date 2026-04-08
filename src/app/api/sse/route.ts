import { addConnection, removeConnection } from "@/server/sse";
import { startHeartbeat } from "@/server/heartbeat";

export const dynamic = "force-dynamic";

export async function GET() {
  // Start heartbeat timer on first SSE connection
  startHeartbeat();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      addConnection(controller);

      // Send initial keepalive
      controller.enqueue(encoder.encode(": keepalive\n\n"));
    },
    cancel(controller) {
      removeConnection(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
