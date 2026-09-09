"use client";

import { useEffect } from "react";
import { useScheduleStore } from "@/lib/store/scheduleStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { accentColor } = useScheduleStore();

  useEffect(() => {
    const htmlEl = document.documentElement;

    // App is light mode only — always apply the light theme class.
    htmlEl.classList.remove("theme-dark", "dark");
    htmlEl.classList.add("theme-light", "light");

    // Toggle accent classes
    htmlEl.classList.remove("accent-purple", "accent-blue", "accent-green", "accent-orange");
    htmlEl.classList.add(`accent-${accentColor || "purple"}`);
  }, [accentColor]);

  // Read immediately from localStorage on early mount to prevent hydration styling delays
  useEffect(() => {
    const localAccent = localStorage.getItem("chronova_accent");
    const htmlEl = document.documentElement;

    htmlEl.classList.remove("theme-dark", "dark");
    htmlEl.classList.add("theme-light", "light");

    if (localAccent) {
      htmlEl.classList.remove("accent-purple", "accent-blue", "accent-green", "accent-orange");
      htmlEl.classList.add(`accent-${localAccent}`);
    }
  }, []);

  return <>{children}</>;
}
