import { NextRequest, NextResponse } from "next/server";
import { generateInstitutionTimetable } from "@/lib/scheduling/engine";

export async function POST(req: NextRequest) {
  try {
    const { institution } = await req.json();

    if (!institution) {
      return NextResponse.json({ error: "Institution data is required." }, { status: 400 });
    }

    const result = generateInstitutionTimetable(institution);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Timetable generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate timetable programmatically." },
      { status: 500 }
    );
  }
}
