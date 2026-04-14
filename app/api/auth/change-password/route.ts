import { z } from "zod";
import { fail, ok, parseZodError } from "@/lib/api";
import { getSession, unauthorizedResponse } from "@/lib/auth";
import { updateRow } from "@/lib/db";
import { User } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const parsed = changePasswordSchema.parse(body);

    const supabase = await createClient();
    const { error: authError } = await supabase.auth.updateUser({
      password: parsed.newPassword
    });

    if (authError) {
      return fail(`Failed to update password: ${authError.message}`, 400);
    }

    await updateRow<User>("users", session.userId, {
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

