import { NextResponse } from "next/server";
import { runSnowflake } from "@/lib/snowflake";

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    console.log("Chatbot question:", question);

    const searchSql = `
      WITH query AS (
        SELECT SNOWFLAKE.CORTEX.EMBED_TEXT_768(
          'snowflake-arctic-embed-m-v1.5',
          ?
        ) AS qvec
      )
      SELECT 
        f.FEEDBACK_ID,
        f.COURSE_NAME,
        f.COURSE_ID,
        f.USERNAME,
        f.TEXT_RESPONSE,
        f.THEMES,
        f.ACTIONABLE_SUGGESTION,
        f.SENTIMENT_LABEL,
        f.INSTRUCTOR_NAME,
        f.INSTRUCTOR_ID,
        VECTOR_COSINE_SIMILARITY(f.RESPONSE_EMBEDDING, q.qvec) AS cosine_sim
      FROM FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG f, query q
      ORDER BY cosine_sim DESC
      LIMIT 100
    `;
    const topFeedback = await runSnowflake(searchSql, [question]);

    if (!topFeedback.length) {
      return NextResponse.json({
        question,
        answer: "⚠️ No relevant feedback found.",
        sources: [],
      });
    }

    const feedbackText = topFeedback
      .map(
        (row: any) =>
          `${row.COURSE_NAME} | ${row.COURSE_ID} | ${row.USERNAME} | ${row.TEXT_RESPONSE} | ${row.THEMES} | ${row.ACTIONABLE_SUGGESTION} | ${row.INSTRUCTOR_NAME} | ${row.INSTRUCTOR_ID}`
      )
      .join("\n");

    const prompt = `
You are an assistant answering questions based on student feedback data.
Here are some relevant feedback rows:
${feedbackText}

User question: "${question}"

Answer clearly using only this data.
    `;

    const cortexSql = `
      SELECT SNOWFLAKE.CORTEX.COMPLETE(
        'llama3-8b',
        ?
      ) AS RESPONSE
    `;
    const [cortexRow] = await runSnowflake(cortexSql, [prompt]);
    const answer = cortexRow.RESPONSE || "No response generated";

    return NextResponse.json({
      question,
      answer,
      sources: topFeedback,
    });
  } catch (err: any) {
    console.error("Chatbot API Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
