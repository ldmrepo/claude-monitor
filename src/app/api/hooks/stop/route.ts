import { handleHookRequest } from "@/server/hook-handler";

export async function POST(request: Request) {
  return handleHookRequest(request, "Stop");
}
