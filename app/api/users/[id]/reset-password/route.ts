import { fail, ok } from "@/lib/api";
import { getSessionFromRequest, requirePermission } from "@/lib/auth";
import { listRows, updateRow } from "@/lib/db";
import { User } from "@/lib/types";
import { generatePassword, hashPassword } from "@/lib/security";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const role = requirePermission(request, "manageUsers");
  if (role instanceof Response) {
    return role;
  }

  const session = getSessionFromRequest(request);
  if (!session) {
    return fail("Authentication required", 401);
  }

  const { id } = await context.params;
  const users = await listRows<User>("users");
  const user = users.find((candidate) => candidate.id === id);
  if (!user) {
    return fail("User not found", 404);
  }

  const password = generatePassword();
  const updated = await updateRow<User>("users", id, {
    password_hash: hashPassword(password),
    must_change_password: true,
  });

  if (!updated) {
    return fail("User not found", 404);
  }

  await logAuditEvent({
    action: "user_password_reset",
    actorEmail: session.email,
    actorRole: session.role,
    targetUserId: updated.id,
    targetUserEmail: updated.email,
    details: "Password reset by admin",
  });

  return ok({
    role,
    data: {
      id: updated.id,
      email: updated.email,
      password,
    },
  });
}
