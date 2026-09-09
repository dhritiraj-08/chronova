import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--c-base)", position: "relative" }}>
      {/* Subtle top accent line */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, var(--c-accent), transparent)", zIndex: 200 }} />
      {children}
    </div>
  );
}
