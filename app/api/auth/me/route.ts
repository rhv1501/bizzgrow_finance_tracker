import { ok, fail } from "@/lib/api";
import { getSessionFromRequest, isPasswordChangeRequired } from "@/lib/auth";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return fail("Authentication required", 401);
  }

  return ok({
    requiresPasswordChange: isPasswordChangeRequired(request),
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
    },
  });
}
