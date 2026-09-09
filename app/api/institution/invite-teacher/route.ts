import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function generateTempPassword(): string {
  // Readable-ish random password: e.g. "Chronova-7f3a9c21"
  const rand = Math.random().toString(36).slice(2, 10);
  return `Chronova-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { institutionId, name, email, subjects, maxHoursPerWeek, availableDays, availableFrom, availableUntil } = body;

    if (!institutionId || !name || !email) {
      return NextResponse.json({ error: "institutionId, name, and email are required." }, { status: 400 });
    }

    // Identify the caller from their session cookie and verify they really
    // are the admin of this institution before we touch anything with the
    // service-role client.
    const serverClient = await createServerClient();
    const { data: { user: caller } } = await serverClient.auth.getUser();
    if (!caller) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const { data: institution } = await serverClient
      .from("institutions")
      .select("id, admin_id")
      .eq("id", institutionId)
      .maybeSingle();

    if (!institution || institution.admin_id !== caller.id) {
      return NextResponse.json({ error: "You are not the admin of this institution." }, { status: 403 });
    }

    const admin = createAdminClient();
    const tempPassword = generateTempPassword();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: name, role: "institution" }
    });

    if (createErr || !created.user) {
      const msg = createErr?.message?.toLowerCase() || "";
      const isDuplicate = msg.includes("already been registered") || msg.includes("already registered") || msg.includes("already exists");
      return NextResponse.json(
        { error: createErr?.message || "Failed to create teacher account.", code: isDuplicate ? "email_exists" : undefined },
        { status: 400 }
      );
    }

    const teacherId = crypto.randomUUID();

    const [{ error: profileErr }, { error: rosterErr }, { error: memberErr }] = await Promise.all([
      admin.from("teacher_profiles").insert({
        id: teacherId,
        user_id: created.user.id,
        institution_id: institutionId,
        name,
        email,
        subjects: subjects || [],
        max_hours_per_week: maxHoursPerWeek ?? 20
      }),
      admin.from("teachers").insert({
        id: teacherId,
        institution_id: institutionId,
        name,
        subjects: subjects || [],
        available_days: availableDays || [],
        available_from: availableFrom || "08:00",
        available_until: availableUntil || "16:00"
      }),
      admin.from("institution_members").insert({
        institution_id: institutionId,
        user_id: created.user.id,
        role: "teacher"
      })
    ]);

    if (profileErr || rosterErr || memberErr) {
      console.error("Teacher provisioning row error:", profileErr || rosterErr || memberErr);
      return NextResponse.json({ error: "Account created but teacher records failed to save. Contact support." }, { status: 500 });
    }

    return NextResponse.json({ success: true, tempPassword, teacherId });
  } catch (err: any) {
    console.error("Invite teacher error:", err);
    return NextResponse.json({ error: err.message || "Something went wrong." }, { status: 500 });
  }
}
