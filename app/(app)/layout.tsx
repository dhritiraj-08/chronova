"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { createClient } from "@/lib/supabase/client";
import { resolveUserRole, roleHomePath } from "@/lib/auth/resolveRole";
import FloatingAssistant from "@/components/chat/FloatingAssistant";

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const role = await resolveUserRole(supabase, user);
      const isAdminArea = pathname.startsWith("/admin");
      const isTeacherArea = pathname.startsWith("/teacher");
      const isSettings = pathname === "/settings";
      const home = roleHomePath(role);

      // Every role gets its own home area, and /settings stays reachable
      // by everyone. Anything outside that gets bounced to the role's own
      // home page — this is what makes /admin, /teacher, and every student
      // page mutually exclusive per role, with no ?role= override needed.
      const outOfBounds =
        (role === "student" && (isAdminArea || isTeacherArea)) ||
        (role === "admin" && (isTeacherArea || (!isAdminArea && !isSettings))) ||
        (role === "teacher" && (isAdminArea || (!isTeacherArea && !isSettings)));

      if (outOfBounds) {
        router.push(home);
        return;
      }

      setLoading(false);
    });
  }, [pathname, router]);

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "var(--c-base)", color: "var(--c-text-secondary)" }}>
        <div style={{ fontSize: "14px", fontWeight: 600 }}>Loading Chronova OS...</div>
      </div>
    );
  }

  return (
    // height (not minHeight) caps the whole shell to the viewport, so the
    // right-hand column below is height-constrained too and <main> becomes
    // the one real internal scroll container. Without this cap, the column
    // just grows to fit its content and the page/body scrolls instead — which
    // breaks Navbar's `position: sticky` (it has nothing to stick against)
    // and made the previously-plain header scroll out of view entirely.
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <Navbar />
        <main
          className="app-main-content"
          style={{
            flex: 1,
            overflowY: "auto",
            background: "var(--c-base)",
          }}
        >
          {children}
        </main>
      </div>
      <FloatingAssistant />
    </div>
  );
}
