"use client";

import { useEffect, useState } from "react";

type SSEHandler = (data: unknown) => void;

let globalEventSource: EventSource | null = null;
const listeners = new Map<string, Set<SSEHandler>>();

function dispatchToHandlers(channel: string, event: MessageEvent) {
  try {
    const data = JSON.parse(event.data);
    const handlers = listeners.get(channel);
    if (handlers) {
      for (const h of handlers) h(data);
    }
  } catch {
    // Ignore malformed SSE data
  }
}

function addChannelToEventSource(es: EventSource, channel: string) {
  es.addEventListener(channel, (event: MessageEvent) => dispatchToHandlers(channel, event));
}

function ensureConnection() {
  if (globalEventSource && globalEventSource.readyState !== EventSource.CLOSED) return;

  globalEventSource = new EventSource("/api/sse");

  // Re-attach all existing channels on new connection
  for (const channel of listeners.keys()) {
    addChannelToEventSource(globalEventSource, channel);
  }

  globalEventSource.onerror = () => {
    if (globalEventSource?.readyState === EventSource.CLOSED) {
      globalEventSource = null;
      setTimeout(ensureConnection, 3000);
    }
  };
}

function subscribe(channel: string, handler: SSEHandler) {
  ensureConnection();

  if (!listeners.has(channel)) {
    listeners.set(channel, new Set());
    if (globalEventSource) {
      addChannelToEventSource(globalEventSource, channel);
    }
  }

  listeners.get(channel)!.add(handler);
}

function unsubscribe(channel: string, handler: SSEHandler) {
  listeners.get(channel)?.delete(handler);
}

export function useSSE(channel: string): number {
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const handler: SSEHandler = () => setRefreshCount((c) => c + 1);
    subscribe(channel, handler);
    return () => unsubscribe(channel, handler);
  }, [channel]);

  return refreshCount;
}

export function useSSEMulti(channels: string[]): number {
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const handler: SSEHandler = () => setRefreshCount((c) => c + 1);
    for (const ch of channels) subscribe(ch, handler);
    return () => { for (const ch of channels) unsubscribe(ch, handler); };
  }, [channels.join(",")]);

  return refreshCount;
}
