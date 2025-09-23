import { NextResponse } from "next/server";
import { searchChatFeedback } from "@/services/chatService";

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    const result = await searchChatFeedback(question);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Chatbot API Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
