import { NextRequest, NextResponse } from "next/server";
import { rescheduleMissedSessions } from "@/lib/scheduling/engine";

export async function POST(req: NextRequest) {
  try {
    const { missedSessions, remainingDays, constraints } = await req.json();
    const result = rescheduleMissedSessions(missedSessions, remainingDays, constraints);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Reschedule error:", error);
    return NextResponse.json({ error: "Failed to reschedule programmatically." }, { status: 500 });
  }
}
