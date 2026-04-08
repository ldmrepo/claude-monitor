import { NextResponse } from "next/server";
import { processHookEvent } from "./pipeline";

/**
 * Shared handler for all hook API routes.
 * Each route only needs to call this with the default hook event name.
 */
export async function handleHookRequest(request: Request, defaultEventName: string) {
  try {
    const payload = await request.json();
    payload.hook_event_name = payload.hook_event_name || defaultEventName;
    const result = processHookEvent(payload);

    if (!result.success && !result.rawEventId) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({});
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
