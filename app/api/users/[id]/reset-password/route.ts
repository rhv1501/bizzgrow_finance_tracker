import { fail, ok } from "@/lib/api";
import { getSession, requirePermission } from "@/lib/auth";
import { listRows, updateRow } from "@/lib/db";
import { User } from "@/lib/types";
import { generatePassword } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const role = await requirePermission("manageUsers");
  if (role instanceof Response) {
    return role;
  }

  const session = await getSession();
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
  
  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.updateUserById(id, { password });
  if (authError) {
    return fail(`Failed to update password in Auth: ${authError.message}`, 400);
  }

  const updated = await updateRow<User>("users", id, {
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
