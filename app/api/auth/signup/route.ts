import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// One email = one portal. Supabase Auth already refuses to create a second
// account with a duplicate email — but its own error message doesn't say
// WHICH portal that email belongs to. This looks that up so the signup
// error can be specific ("already an institution account" / "already a
// student account") instead of a generic "already registered".
async function describeExistingAccount(supabaseAdmin: ReturnType<typeof createAdminClient>, email: string): Promise<"institution" | "student" | "unknown"> {
  // No direct getUserByEmail in the admin API — list and match. Fine at this
  // app's scale; a large user base would need a paginated search instead.
  const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingUser = usersPage?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!existingUser) return "unknown";

  const { data: membership } = await supabaseAdmin
    .from("institution_members")
    .select("role")
    .eq("user_id", existingUser.id)
    .limit(1);

  return membership && membership.length > 0 ? "institution" : "student";
}

export async function POST(request: Request) {
  try {
    const { email, password, name, role, institutionName } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required." },
        { status: 400 }
      );
    }
    if (role === "institution" && !institutionName) {
      return NextResponse.json(
        { error: "Institution name is required." },
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

      if (isDuplicate) {
        const existingPortal = await describeExistingAccount(supabaseAdmin, email);
        let specificError = error.message;
        if (role === "student" && existingPortal === "institution") {
          specificError = "This email is already registered as an institution account. Please use a different email for your student account.";
        } else if (role === "institution" && existingPortal === "student") {
          specificError = "This email is already registered as a student account. Please use a different email for your institution account.";
        } else {
          specificError = "This email is already registered.";
        }
        return NextResponse.json({ error: specificError, code: "email_exists" }, { status: 400 });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // For an institution signup, create the institution + its admin
    // membership row right away with the name the admin actually typed.
    // Without this, the account still works — institutionStore's
    // loadAdminData() lazily provisions a "My Institution" placeholder the
    // first time they open /admin — but eagerly creating it here means the
    // real institution name is set from the start instead of a placeholder.
    if (role === "institution" && data.user) {
      const { data: created, error: instError } = await supabaseAdmin
        .from("institutions")
        .insert({ name: institutionName, type: "school", admin_id: data.user.id })
        .select("id")
        .single();

      if (instError || !created) {
        console.error("Failed to create institution row during signup:", instError);
        // Don't fail the whole signup — the account exists and works;
        // loadAdminData()'s lazy-provisioning fallback will still run the
        // first time this admin opens /admin, just with a placeholder name.
      } else {
        const { error: memberError } = await supabaseAdmin
          .from("institution_members")
          .insert({ institution_id: created.id, user_id: data.user.id, role: "admin" });
        if (memberError) {
          console.error("Failed to create institution_members row during signup:", memberError);
        }
      }
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
