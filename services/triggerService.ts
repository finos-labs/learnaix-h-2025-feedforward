import { runSnowflake } from "@/lib/snowflake";
import { createTableQuery, mergeFeedbackQuery } from "@/queries/triggerQueries";

export async function ensureFeedbackTable() {
  await runSnowflake(createTableQuery);
}

export async function syncFeedbackResponses(body: any) {
  await ensureFeedbackTable();
  let successCount = 0;

  for (const response of body.responses || []) {
    try {
      await runSnowflake(mergeFeedbackQuery, [
        body.feedback.id,
        body.feedback.name,
        body.course.id,
        body.course.name,
        response.question,
        response.feedback_type,
        response.response,
        body.submitted_at,
        body.user.id,
        body.user.username,
        body.user.firstname,
        body.user.lastname,
        body.user.email,
        body.instructor?.id ?? null,
        body.instructor?.name ?? null,
      ]);
      successCount++;
    } catch (sfErr: any) {
      console.error("Snowflake insert failed:", sfErr.message, {
        feedback_id: body.feedback.id,
        user_id: body.user.id,
        question: response.question,
      });
    }
  }

  return successCount;
}
