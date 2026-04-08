import type { InferSelectModel } from "drizzle-orm";
import type {
  sessionCurrent,
  toolExecCurrent,
  taskCurrent,
  agentCurrent,
  alertCurrent,
  events,
} from "@/db/schema";

// Drizzle-inferred row types for each projection table
export type SessionRow = InferSelectModel<typeof sessionCurrent>;
export type ToolExecRow = InferSelectModel<typeof toolExecCurrent>;
export type TaskRow = InferSelectModel<typeof taskCurrent>;
export type AgentRow = InferSelectModel<typeof agentCurrent>;
export type AlertRow = InferSelectModel<typeof alertCurrent>;
export type EventRow = InferSelectModel<typeof events>;

// Session detail API response
export interface SessionDetailResponse {
  session: SessionRow;
  tools: ToolExecRow[];
  tasks: TaskRow[];
  agents: AgentRow[];
}
