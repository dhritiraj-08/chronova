"use client";

// A plain two-dropdown time picker (hour 00–23, minute in 15-min steps) that
// stands in for `<input type="time">` everywhere the app lets a student pick
// a time. Native time inputs render as an OS wheel/drum picker on iOS Safari
// and many Android WebViews — exactly the hard-to-use "scroll picker" this
// replaces — while two `<select>`s render identically (and are just as fast
// to use with a mouse or a thumb) on every browser and platform.
import { useId } from "react";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

function nearestMinuteStep(min: string): string {
  if (MINUTES.includes(min)) return min;
  const target = parseInt(min, 10) || 0;
  return MINUTES.reduce((closest, opt) =>
    Math.abs(parseInt(opt, 10) - target) < Math.abs(parseInt(closest, 10) - target) ? opt : closest
  , "00");
}

interface TimeInputProps {
  /** 24-hour "HH:MM" string, matching the format `<input type="time">` used. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
}

export function TimeInput({ value, onChange, id, disabled }: TimeInputProps) {
  const autoId = useId();
  const baseId = id || autoId;
  const [rawHour, rawMinute] = (value || "09:00").split(":");
  const hour = HOURS.includes(rawHour) ? rawHour : "09";
  const minute = nearestMinuteStep(rawMinute ?? "00");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <select
        id={`${baseId}-hour`}
        className="input"
        style={{ flex: 1, paddingRight: "4px" }}
        value={hour}
        disabled={disabled}
        onChange={(e) => onChange(`${e.target.value}:${minute}`)}
        aria-label="Hour"
      >
        {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <span style={{ color: "var(--c-text-tertiary)", fontSize: "13px", fontWeight: 600 }}>:</span>
      <select
        id={`${baseId}-minute`}
        className="input"
        style={{ flex: 1, paddingRight: "4px" }}
        value={minute}
        disabled={disabled}
        onChange={(e) => onChange(`${hour}:${e.target.value}`)}
        aria-label="Minute"
      >
        {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  );
}
