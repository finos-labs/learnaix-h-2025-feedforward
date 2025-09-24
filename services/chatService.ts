import { runSnowflake } from "@/lib/snowflake";
import {
  searchFeedbackQuery,
  cortexCompletionQuery,
  getSummaryQueryDataset
} from "@/queries/chatQueries";

function buildClassifierPrompt(question: string): string {
  return `
Classify the following user question as either:
- "structured" (can be answered using a summary table),
- or "unstructured" (requires raw student feedback analysis).

Respond ONLY with one word: structured or unstructured.

Question: "${question}"
`;
}

function buildStructuredPrompt(summaryData: any[], question: string): string {
  const formatted = summaryData
    .map(row =>
      `Course ID: ${row.COURSE_ID}
  - Total Feedback: ${row.NUMBER_OF_FEEDBACKS}
  - Positive: ${row.NUMBER_OF_POSITIVE_FEEDBACK}
  - Neutral: ${row.NUMBER_OF_NEUTRAL_FEEDBACK}
  - Negative: ${row.NUMBER_OF_NEGATIVE_FEEDBACK}
  - Theme - Content: ${row.NUMBER_OF_THEME_CONTENT}
  - Theme - Platform: ${row.NUMBER_OF_THEME_PLATFORM}
  - Theme - Instructor: ${row.NUMBER_OF_THEME_INSTRUCTOR}
  - Theme - Experience: ${row.NUMBER_OF_THEME_EXPERIENCE}
  - Theme - Other: ${row.NUMBER_OF_THEME_OTHER}
  - Urgency: ${row.NUMBER_OF_URGENCY_FLAG_TRUE} urgent / ${row.NUMBER_OF_URGENCY_FLAG_FALSE} not urgent
  - Numeric Ratings: 1:${row.NUMBER_OF_NUMERIC_RESPONSE_1}, 2:${row.NUMBER_OF_NUMERIC_RESPONSE_2}, 3:${row.NUMBER_OF_NUMERIC_RESPONSE_3}, 4:${row.NUMBER_OF_NUMERIC_RESPONSE_4}, 5:${row.NUMBER_OF_NUMERIC_RESPONSE_5}`
    )
    .join("\n\n");

  return `
You are an assistant answering questions about course feedback.

Below is a summary of feedback per course, based on pre-aggregated statistics:

${formatted}

User question: "${question}"

Use only the structured summary data above to answer. Provide counts and insights where relevant. Do not assume or fabricate data.
`;
}

function buildUnstructuredPrompt(topFeedback: any[], question: string): string {
  const feedbackText = topFeedback
    .map(
      (row) =>
        `${row.COURSE_NAME} | ${row.COURSE_ID} | ${row.USERNAME} | ${row.TEXT_RESPONSE} | ${row.THEMES} | ${row.ACTIONABLE_SUGGESTION} | ${row.INSTRUCTOR_NAME} | ${row.INSTRUCTOR_ID}`
    )
    .join("\n");

  return `
You are an assistant answering questions based on student feedback data.

Here are relevant feedback rows:
${feedbackText}

User question: "${question}"

Answer clearly using only this data.
`;
}

export async function searchChatFeedback(question: string) {
  // Step 1: Use LLM to classify the question
  const classifierPrompt = buildClassifierPrompt(question);
  const [classificationRow] = await runSnowflake(cortexCompletionQuery, [classifierPrompt]);
  const classification = (classificationRow?.RESPONSE || "").trim().toLowerCase();

  if (classification === "structured") {
    // Step 2A: Structured mode
    const summaryData = await runSnowflake(getSummaryQueryDataset, []);

    if (!summaryData.length) {
      return {
        question,
        answer: "⚠️ No summary data available.",
        sources: [],
      };
    }

    const prompt = buildStructuredPrompt(summaryData, question);
    const [responseRow] = await runSnowflake(cortexCompletionQuery, [prompt]);
    const answer = responseRow?.RESPONSE || "⚠️ No answer generated from summary data.";

    return {
      question,
      answer,
      sources: summaryData,
    };

  } else {
    // Step 2B: Unstructured fallback (raw feedback)
    const topFeedback = await runSnowflake(searchFeedbackQuery, [question]);

    if (!topFeedback.length) {
      return {
        question,
        answer: "⚠️ No relevant feedback found.",
        sources: [],
      };
    }

    const prompt = buildUnstructuredPrompt(topFeedback, question);
    const [responseRow] = await runSnowflake(cortexCompletionQuery, [prompt]);
    const answer = responseRow?.RESPONSE || "⚠️ No answer generated from feedback.";

    return {
      question,
      answer,
      sources: topFeedback,
    };
  }
}
