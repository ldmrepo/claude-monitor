"use client";

import { useEffect, useState } from "react";

type SSEHandler = (data: unknown) => void;

let globalEventSource: EventSource | null = null;
const listeners = new Map<string, Set<SSEHandler>>();

function attachChannelListeners(es: EventSource) {
  for (const [channel, handlers] of listeners) {
    if (handlers.size === 0) continue;
    es.addEventListener(channel, (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        for (const h of handlers) {
          h(data);
        }
      } catch {
        // Ignore malformed SSE data
      }
    });
  }
}

function ensureConnection() {
  if (globalEventSource && globalEventSource.readyState !== EventSource.CLOSED) {
    return;
  }

  globalEventSource = new EventSource("/api/sse");

  // Re-attach all existing channel listeners on new connection
  attachChannelListeners(globalEventSource);

  globalEventSource.onerror = () => {
    // EventSource auto-reconnects. When it does, we get a new connection
    // but the same EventSource instance — listeners persist.
    // If the EventSource is CLOSED (not reconnecting), create a new one.
    if (globalEventSource?.readyState === EventSource.CLOSED) {
      globalEventSource = null;
      // Retry after a short delay
      setTimeout(ensureConnection, 3000);
    }
  };
}

function subscribe(channel: string, handler: SSEHandler) {
  ensureConnection();

  if (!listeners.has(channel)) {
    listeners.set(channel, new Set());

    // Attach listener to current EventSource for this new channel
    if (globalEventSource) {
      globalEventSource.addEventListener(channel, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const handlers = listeners.get(channel);
          if (handlers) {
            for (const h of handlers) {
              h(data);
            }
          }
        } catch {
          // Ignore malformed SSE data
        }
      });
    }
  }

  listeners.get(channel)!.add(handler);
}

function unsubscribe(channel: string, handler: SSEHandler) {
  const handlers = listeners.get(channel);
  if (handlers) {
    handlers.delete(handler);
  }
}

/**
 * Subscribe to SSE events on a given channel.
 * Returns a refresh counter that increments on each event.
 */
export function useSSE(channel: string): number {
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const handler: SSEHandler = () => {
      setRefreshCount((c) => c + 1);
    };

    subscribe(channel, handler);
    return () => unsubscribe(channel, handler);
  }, [channel]);

  return refreshCount;
}

/**
 * Subscribe to multiple SSE channels.
 */
export function useSSEMulti(channels: string[]): number {
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const handler: SSEHandler = () => {
      setRefreshCount((c) => c + 1);
    };

    for (const ch of channels) {
      subscribe(ch, handler);
    }

    return () => {
      for (const ch of channels) {
        unsubscribe(ch, handler);
      }
    };
  }, [channels.join(",")]);

  return refreshCount;
}
