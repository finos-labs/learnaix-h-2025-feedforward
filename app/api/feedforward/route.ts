import { NextResponse } from "next/server";
import { syncFeedbackResponses } from "@/services/triggerService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const count = await syncFeedbackResponses(body);

    return NextResponse.json({
      message: `Synced ${count} responses`,
    });
  } catch (err: any) {
    console.error("API Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
