import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, parseZodError } from "@/lib/api";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.parse(body);

    const supabase = await createClient();
    
    // Attempt login with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: parsed.email,
      password: parsed.password,
    });

    if (authError || !authData.user) {
      return fail("Invalid email or password", 401);
    }

    // Fetch user profile info using admin client to bypass cookie delay
    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    return NextResponse.json({
      ok: true,
      requiresPasswordChange: Boolean(profile?.must_change_password),
      user: {
        id: authData.user.id,
        name: profile?.name || "Unknown",
        email: authData.user.email,
        role: profile?.role || "employee",
      },
    });
  } catch (error) {
    return fail(parseZodError(error), 400);
  }
}
