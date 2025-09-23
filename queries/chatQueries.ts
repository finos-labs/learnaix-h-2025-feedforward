export const searchFeedbackQuery = `
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

export const cortexCompletionQuery = `
  SELECT SNOWFLAKE.CORTEX.COMPLETE(
    'llama3-8b',
    ?
  ) AS RESPONSE
`;
