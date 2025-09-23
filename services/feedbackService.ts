import { runSnowflake } from "@/lib/snowflake";
import { getFeedbackQuery, getCourseQuery, getActionableInsightsQuery } from "@/queries/feedbackQueries";

export async function getFeedbackData() {
  const [feedbackRows, courseRows, insightsRows] = await Promise.all([
    runSnowflake(getFeedbackQuery),
    runSnowflake(getCourseQuery),
    runSnowflake(getActionableInsightsQuery),
  ]);

  return { feedback: feedbackRows, courses: courseRows, insights: insightsRows };
}
