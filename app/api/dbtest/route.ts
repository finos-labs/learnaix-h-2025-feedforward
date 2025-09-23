import { NextResponse } from "next/server";
import { query } from "@/lib/db";  // using your lib/db.ts

export async function GET() {
  try {
    const result = await query("SELECT id, username, email FROM mdl_user LIMIT 5");

    return NextResponse.json({
      ok: true,
      databases: result.rows,
    });
  } catch (error: any) {
    console.error("DB connection failed:", error.message);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
