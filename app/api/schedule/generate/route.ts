import { NextRequest, NextResponse } from "next/server";
import { generateRulesBasedSchedule } from "@/lib/scheduling/engine";

export async function POST(req: NextRequest) {
  try {
    const { profile } = await req.json();

    if (!profile) {
      return NextResponse.json({ error: "Profile data is required." }, { status: 400 });
    }

    const result = generateRulesBasedSchedule(profile);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Schedule generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate schedule programmatically." },
      { status: 500 }
    );
  }
}
