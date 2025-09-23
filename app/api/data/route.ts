import { NextResponse } from 'next/server';
import { runSnowflake } from '@/lib/snowflake';

export async function GET() {
  try {
    const rows = await runSnowflake('SELECT * FROM MOODLE_FEEDBACK_AI_AUG');
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
