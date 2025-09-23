import { runSnowflake } from "@/lib/snowflake";
import { searchFeedbackQuery, cortexCompletionQuery } from "@/queries/chatQueries";

export async function searchChatFeedback(question: string) {
  const topFeedback = await runSnowflake(searchFeedbackQuery, [question]);

  if (!topFeedback.length) {
    return { question, answer: "No relevant feedback found.", sources: [] };
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

  const [cortexRow] = await runSnowflake(cortexCompletionQuery, [prompt]);
  const answer = cortexRow.RESPONSE || "No response generated";

  return { question, answer, sources: topFeedback };
}
