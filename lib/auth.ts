import { NextResponse } from "next/server";
import { hasPermission, Permission } from "@/lib/permissions";
import { Role } from "@/lib/types";

const allowedRoles: Role[] = ["admin", "manager", "staff", "viewer", "employee"];

export function parseCookieValue(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const chunks = cookieHeader.split(";");
  for (const chunk of chunks) {
    const [cookieKey, ...cookieValue] = chunk.trim().split("=");
    if (cookieKey === key) {
      return decodeURIComponent(cookieValue.join("="));
    }
  }

  return null;
}

export function getRoleFromRequest(request: Request): Role {
  const cookieRole = parseCookieValue(request.headers.get("cookie"), "ft_role");
  if (cookieRole && allowedRoles.includes(cookieRole as Role)) {
    return cookieRole as Role;
  }

  return "viewer";
}

export type AuthSession = {
  userId: string;
  name: string;
  email: string;
  role: Role;
};

export function getSessionFromRequest(request: Request): AuthSession | null {
  const cookieHeader = request.headers.get("cookie");
  const userId = parseCookieValue(cookieHeader, "ft_user_id");
  const name = parseCookieValue(cookieHeader, "ft_user_name");
  const email = parseCookieValue(cookieHeader, "ft_user_email");
  const role = parseCookieValue(cookieHeader, "ft_role");

  if (!userId || !name || !email || !role || !allowedRoles.includes(role as Role)) {
    return null;
  }

  return {
    userId,
    name,
    email,
    role: role as Role,
  };
}

export function isPasswordChangeRequired(request: Request): boolean {
  const flag = parseCookieValue(request.headers.get("cookie"), "ft_must_change_password");
  return flag === "1";
}

export function unauthorizedResponse(message = "Authentication required") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function denyResponse(message = "Not authorized") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function requirePermission(request: Request, permission: Permission): Role | NextResponse {
  const session = getSessionFromRequest(request);
  if (!session) {
    return unauthorizedResponse();
  }

  const role = session.role;
  if (!hasPermission(role, permission)) {
    return denyResponse();
  }

  return role;
}
