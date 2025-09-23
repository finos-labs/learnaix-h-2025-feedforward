export const createTableQuery = `
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
    email STRING,
    instructor_id INT,
    instructor_name STRING
  );
`;

export const mergeFeedbackQuery = `
  MERGE INTO Moodle_Feedback t
  USING (SELECT 
          ? AS feedback_id,
          ? AS feedback_activity,
          ? AS course_id,
          ? AS course_name,
          ? AS question,
          ? AS feedback_type,
          ? AS response,
          TO_TIMESTAMP(?) AS submitted_at,
          ? AS user_id,
          ? AS username,
          ? AS firstname,
          ? AS lastname,
          ? AS email,
          ? AS instructor_id,
          ? AS instructor_name) s
  ON t.user_id = s.user_id
     AND t.feedback_id = s.feedback_id
     AND t.question = s.question
     AND t.submitted_at = s.submitted_at
  WHEN NOT MATCHED THEN
    INSERT (
      feedback_id,
      feedback_activity,
      course_id,
      course_name,
      question,
      feedback_type,
      response,
      submitted_at,
      user_id,
      username,
      firstname,
      lastname,
      email,
      instructor_id,
      instructor_name
    )
    VALUES (
      s.feedback_id,
      s.feedback_activity,
      s.course_id,
      s.course_name,
      s.question,
      s.feedback_type,
      s.response,
      s.submitted_at,
      s.user_id,
      s.username,
      s.firstname,
      s.lastname,
      s.email,
      s.instructor_id,
      s.instructor_name
    );
`;
