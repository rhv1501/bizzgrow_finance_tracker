import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, parseZodError } from "@/lib/api";
import { createRow, listRows, updateRow } from "@/lib/db";
import { User } from "@/lib/types";
import { hashPassword, normalizeEmail, verifyPassword } from "@/lib/security";

const BOOTSTRAP_ADMIN_EMAIL = normalizeEmail(
  process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@bizzgrow.com",
);
const BOOTSTRAP_ADMIN_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin@123";

async function ensureBootstrapAdminUser(users: User[]): Promise<User | null> {
  const hasCredentialedUsers = users.some(
    (user) => Boolean(user.email && user.password_hash),
  );

  if (hasCredentialedUsers) {
    return null;
  }

  const existingByEmail = users.find(
    (user) => normalizeEmail(user.email || "") === BOOTSTRAP_ADMIN_EMAIL,
  );

  if (existingByEmail) {
    const updated = await updateRow<User>("users", existingByEmail.id, {
      email: BOOTSTRAP_ADMIN_EMAIL,
      password_hash: hashPassword(BOOTSTRAP_ADMIN_PASSWORD),
      must_change_password: true,
      role: "admin",
    });
    return updated;
  }

  const created = await createRow<User>("users", {
    name: "BizzGrow Admin",
    email: BOOTSTRAP_ADMIN_EMAIL,
    password_hash: hashPassword(BOOTSTRAP_ADMIN_PASSWORD),
    must_change_password: true,
    role: "admin",
  });

  return created;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.parse(body);
    const email = normalizeEmail(parsed.email);

    const users = await listRows<User>("users");
    const bootstrapUser = await ensureBootstrapAdminUser(users);
    const searchableUsers = bootstrapUser
      ? users
          .filter((candidate) => candidate.id !== bootstrapUser.id)
          .concat(bootstrapUser)
      : users;

    const user = searchableUsers.find(
      (candidate) => normalizeEmail(candidate.email || "") === email,
    );
    if (!user || !user.password_hash || !verifyPassword(parsed.password, user.password_hash)) {
      return fail("Invalid email or password", 401);
    }

    const response = NextResponse.json({
      ok: true,
      requiresPasswordChange: Boolean(user.must_change_password),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    } as const;

    response.cookies.set("ft_user_id", user.id, cookieOptions);
    response.cookies.set("ft_user_name", user.name, cookieOptions);
    response.cookies.set("ft_user_email", user.email, cookieOptions);
    response.cookies.set("ft_role", user.role, cookieOptions);
    response.cookies.set(
      "ft_must_change_password",
      user.must_change_password ? "1" : "0",
      cookieOptions,
    );

    return response;
  } catch (error) {
    return fail(parseZodError(error), 400);
  }
}
