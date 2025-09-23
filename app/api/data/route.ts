import { NextResponse } from "next/server";
import { getFeedbackData } from "@/services/feedbackService";

export async function GET() {
  try {
    const result = await getFeedbackData();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
