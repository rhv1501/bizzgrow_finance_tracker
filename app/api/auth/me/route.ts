import { ok, fail } from "@/lib/api";
import { getSession, isPasswordChangeRequired } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return fail("Authentication required", 401);
  }

  const requiresPasswordChange = await isPasswordChangeRequired();

  return ok({
    requiresPasswordChange,
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
    },
  });
}
