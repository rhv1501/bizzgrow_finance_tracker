import { NextResponse } from "next/server";
import { hasPermission, Permission } from "@/lib/permissions";
import { Role } from "@/lib/types";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export type AuthSession = {
  userId: string;
  name: string;
  email: string;
  role: Role;
};

export async function getSession(): Promise<AuthSession | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch from public.users to get role and name using admin client to bypass RLS overhead
  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("users")
    .select("name, role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as Role) || user.user_metadata?.role || "employee";

  return {
    userId: user.id,
    name: profile?.name || user.user_metadata?.name || "Unknown",
    email: user.email || "",
    role,
  };
}

export async function isPasswordChangeRequired(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("users")
    .select("must_change_password")
    .eq("id", user.id)
    .single();

  return profile?.must_change_password === true;
}

export function unauthorizedResponse(message = "Authentication required") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function denyResponse(message = "Not authorized") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requirePermission(permission: Permission): Promise<Role | NextResponse> {
  const session = await getSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const role = session.role;
  if (!hasPermission(role, permission)) {
    return denyResponse();
  }

  return role;
}
