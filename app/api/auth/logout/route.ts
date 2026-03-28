import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const clearCookie = {
    path: "/",
    maxAge: 0,
  } as const;

  response.cookies.set("ft_user_id", "", clearCookie);
  response.cookies.set("ft_user_name", "", clearCookie);
  response.cookies.set("ft_user_email", "", clearCookie);
  response.cookies.set("ft_role", "", clearCookie);
  response.cookies.set("ft_must_change_password", "", clearCookie);

  return response;
}
