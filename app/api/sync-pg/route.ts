import { NextResponse } from "next/server";
import { pgClient } from "@/lib/pg";
import { runSnowflake } from "@/lib/snowflake";

const MOODLE_QUERY = `
SELECT 
    f.id AS feedback_id,
    f.name AS feedback_activity,
    c.id AS course_id,
    c.fullname AS course_name,
    i.name AS question,
    i.typ AS feedback_type,
    v.value AS response,
    fc.timemodified AS submitted_at,
    u.id AS user_id,
    u.username,
    u.firstname,
    u.lastname,
    u.email
FROM mdl_feedback_value v
JOIN mdl_feedback_item i ON v.item = i.id
JOIN mdl_feedback f ON i.feedback = f.id
JOIN mdl_course c ON f.course = c.id
JOIN mdl_feedback_completed fc ON v.completed = fc.id
JOIN mdl_user u ON fc.userid = u.id
ORDER BY fc.timemodified DESC;
`;

async function ensureSnowflakeTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS Moodle_Feedback (
      feedback_id INT,
      feedback_activity STRING,
      course_id INT,
      course_name STRING,
      question STRING,
      feedback_type STRING,
      response STRING,
      submitted_at TIMESTAMP,
      user_id INT,
      username STRING,
      firstname STRING,
      lastname STRING,
      email STRING
    );
  `;
  await runSnowflake(createTableQuery);
}

export async function GET() {
  try {
    // Fetch from Postgres
    const res = await pgClient.query(MOODLE_QUERY);

    if (res.rows.length === 0) {
      return NextResponse.json({ ok: true, message: "No rows to sync" });
    }

    await ensureSnowflakeTable();

    const values = res.rows
      .map(
        (row) => `SELECT 
          ${row.feedback_id} AS feedback_id,
          '${row.feedback_activity?.replace(/'/g, "''")}' AS feedback_activity,
          ${row.course_id} AS course_id,
          '${row.course_name?.replace(/'/g, "''")}' AS course_name,
          '${row.question?.replace(/'/g, "''")}' AS question,
          '${row.feedback_type}' AS feedback_type,
          '${row.response?.replace(/'/g, "''")}' AS response,
          TO_TIMESTAMP(${row.submitted_at}) AS submitted_at,
          ${row.user_id} AS user_id,
          '${row.username}' AS username,
          '${row.firstname}' AS firstname,
          '${row.lastname}' AS lastname,
          '${row.email}' AS email`
      )
      .join(" UNION ALL ");

    const mergeQuery = `
      MERGE INTO Moodle_Feedback t
      USING (
        ${values}
      ) s
      ON t.user_id = s.user_id
         AND t.feedback_id = s.feedback_id
         AND t.question = s.question
         AND t.submitted_at = s.submitted_at
      WHEN NOT MATCHED THEN
        INSERT (
          feedback_id, feedback_activity, course_id, course_name,
          question, feedback_type, response, submitted_at,
          user_id, username, firstname, lastname, email
        )
        VALUES (
          s.feedback_id, s.feedback_activity, s.course_id, s.course_name,
          s.question, s.feedback_type, s.response, s.submitted_at,
          s.user_id, s.username, s.firstname, s.lastname, s.email
        );
    `;

    await runSnowflake(mergeQuery);

    return NextResponse.json({
      ok: true,
      message: `Synced ${res.rows.length} rows into Snowflake (batched)`,
    });
  } catch (err: any) {
    console.error("Sync Error:", err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
