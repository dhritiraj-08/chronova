import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { email, password, name, role } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Create user with email auto-confirmed so they can log in instantly
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role: role || "student" },
    });

    if (error) {
      const msg = error.message?.toLowerCase() || "";
      const isDuplicate =
        (error as any).code === "email_exists" ||
        msg.includes("already been registered") ||
        msg.includes("already registered") ||
        msg.includes("already exists");

      return NextResponse.json(
        { error: error.message, code: isDuplicate ? "email_exists" : undefined },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (err: any) {
    console.error("Signup handler error:", err);
    return NextResponse.json(
      { error: err.message || "Something went wrong during signup." },
      { status: 500 }
    );
  }
}
