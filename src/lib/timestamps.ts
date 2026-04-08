export function nowISO(): string {
  return new Date().toISOString();
}

export function parseObservedAt(payload: Record<string, unknown>): string {
  if (typeof payload.observed_at === "string") return payload.observed_at;
  if (typeof payload.timestamp === "string") return payload.timestamp;
  return nowISO();
}
