import { db } from "@/db/init";
import { alertCurrent } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/id";
import { nowISO } from "@/lib/timestamps";
import { broadcast } from "../sse";

interface RaiseAlertParams {
  alertType: string;
  alertScopeType: string;
  alertScopeId: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "critical";
  eventId?: string;
}

function fingerprint(alertType: string, scopeType: string, scopeId: string): string {
  return `${alertType}:${scopeType}:${scopeId}`;
}

export function raiseAlert(params: RaiseAlertParams) {
  const now = nowISO();
  const fp = fingerprint(params.alertType, params.alertScopeType, params.alertScopeId);

  // Check if an open alert with same fingerprint already exists
  const existing = db
    .select()
    .from(alertCurrent)
    .where(
      and(
        eq(alertCurrent.fingerprint, fp),
        eq(alertCurrent.status, "open")
      )
    )
    .get();

  if (existing) return; // Deduplicated

  const alertId = generateId();
  db.insert(alertCurrent).values({
    alertId,
    alertType: params.alertType,
    alertScopeType: params.alertScopeType,
    alertScopeId: params.alertScopeId,
    title: params.title,
    message: params.message,
    severity: params.severity,
    status: "open",
    raisedAt: now,
    fingerprint: fp,
    lastEventId: params.eventId || null,
  }).run();

  broadcast("alert", {
    alertId,
    alertType: params.alertType,
    status: "open",
    severity: params.severity,
    title: params.title,
  });
}

export function clearAlert(alertType: string, scopeType: string, scopeId: string) {
  const now = nowISO();
  const fp = fingerprint(alertType, scopeType, scopeId);

  const existing = db
    .select()
    .from(alertCurrent)
    .where(
      and(
        eq(alertCurrent.fingerprint, fp),
        eq(alertCurrent.status, "open")
      )
    )
    .get();

  if (existing) {
    db.update(alertCurrent)
      .set({ status: "cleared", clearedAt: now })
      .where(eq(alertCurrent.alertId, existing.alertId))
      .run();

    broadcast("alert", {
      alertId: existing.alertId,
      alertType,
      status: "cleared",
    });
  }
}

export function acknowledgeAlert(alertId: string) {
  const now = nowISO();
  db.update(alertCurrent)
    .set({ status: "acknowledged", acknowledgedAt: now })
    .where(eq(alertCurrent.alertId, alertId))
    .run();

  broadcast("alert", { alertId, status: "acknowledged" });
}
