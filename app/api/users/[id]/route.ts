import { fail, ok, parseZodError } from "@/lib/api";
import { deleteRow, listRows, updateRow } from "@/lib/db";
import { getSessionFromRequest, requirePermission } from "@/lib/auth";
import { updateUserSchema } from "@/lib/schemas";
import { User } from "@/lib/types";
import { hashPassword, normalizeEmail } from "@/lib/security";
import { logAuditEvent } from "@/lib/audit";

function sanitizeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  };
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const role = requirePermission(request, "manageUsers");
  if (role instanceof Response) {
    return role;
  }

  const session = getSessionFromRequest(request);
  if (!session) {
    return fail("Authentication required", 401);
  }

  try {
    const body = await request.json();
    const parsed = updateUserSchema.parse(body);
    const { id } = await context.params;

    const users = await listRows<User>("users");
    const existing = users.find((user) => user.id === id);
    if (!existing) {
      return fail("User not found", 404);
    }

    const payload: Record<string, unknown> = { ...parsed };
    if (parsed.email) {
      const nextEmail = normalizeEmail(parsed.email);
      const conflict = users.find((user) => user.id !== id && normalizeEmail(user.email || "") === nextEmail);
      if (conflict) {
        return fail("email: A user with this email already exists", 400);
      }

      payload.email = nextEmail;
    }

    if (parsed.password) {
      payload.password_hash = hashPassword(parsed.password);
      payload.must_change_password = true;
      delete payload.password;
    }

    const updated = await updateRow<User>("users", id, payload);

    if (!updated) {
      return fail("User not found", 404);
    }

    if (parsed.role && parsed.role !== existing.role) {
      await logAuditEvent({
        action: "user_role_changed",
        actorEmail: session.email,
        actorRole: session.role,
        targetUserId: updated.id,
        targetUserEmail: updated.email,
        details: `Role changed from ${existing.role} to ${parsed.role}`,
      });
    }

    return ok({ role, data: sanitizeUser(updated) });
  } catch (error) {
    return fail(parseZodError(error), 400);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const role = requirePermission(request, "manageUsers");
  if (role instanceof Response) {
    return role;
  }

  const { id } = await context.params;
  const deleted = await deleteRow("users", id);
  if (!deleted) {
    return fail("User not found", 404);
  }

  return ok({ role, ok: true });
}
