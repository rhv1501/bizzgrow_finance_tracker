import { z } from "zod";
import { fail, ok, parseZodError } from "@/lib/api";
import { getSessionFromRequest, unauthorizedResponse } from "@/lib/auth";
import { listRows, updateRow } from "@/lib/db";
import { User } from "@/lib/types";
import { hashPassword, verifyPassword } from "@/lib/security";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const parsed = changePasswordSchema.parse(body);

    const users = await listRows<User>("users");
    const user = users.find((candidate) => candidate.id === session.userId);

    if (!user || !user.password_hash) {
      return fail("User not found", 404);
    }

    if (!verifyPassword(parsed.currentPassword, user.password_hash)) {
      return fail("Current password is incorrect", 400);
    }

    await updateRow<User>("users", user.id, {
      password_hash: hashPassword(parsed.newPassword),
      must_change_password: false,
    });

    const response = ok({ ok: true });
    response.cookies.set("ft_must_change_password", "0", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    return fail(parseZodError(error), 400);
  }
}
