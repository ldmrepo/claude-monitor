type SSEController = ReadableStreamDefaultController<Uint8Array>;

const connections = new Set<SSEController>();
const encoder = new TextEncoder();
let keepaliveInterval: ReturnType<typeof setInterval> | null = null;

export function addConnection(controller: SSEController) {
  connections.add(controller);
  ensureKeepalive();
}

export function removeConnection(controller: SSEController) {
  connections.delete(controller);
}

export function broadcast(channel: string, data: unknown) {
  const message = `event: ${channel}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = encoder.encode(message);

  for (const controller of connections) {
    try {
      controller.enqueue(encoded);
    } catch {
      connections.delete(controller);
    }
  }
}

export function getConnectionCount(): number {
  return connections.size;
}

function ensureKeepalive() {
  if (keepaliveInterval) return;
  keepaliveInterval = setInterval(() => {
    const comment = encoder.encode(": keepalive\n\n");
    for (const controller of connections) {
      try {
        controller.enqueue(comment);
      } catch {
        connections.delete(controller);
      }
    }
  }, 30000);
}
