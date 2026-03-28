import { createRow } from "@/lib/db";
import { Role } from "@/lib/types";

type AuditPayload = {
  action: string;
  actorEmail: string;
  actorRole: Role;
  targetUserId: string;
  targetUserEmail: string;
  details?: string;
};

export async function logAuditEvent(payload: AuditPayload) {
  try {
    await createRow("audit_logs", {
      action: payload.action,
      actor_email: payload.actorEmail,
      actor_role: payload.actorRole,
      target_user_id: payload.targetUserId,
      target_user_email: payload.targetUserEmail,
      details: payload.details || "",
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
