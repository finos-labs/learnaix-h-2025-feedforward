
--create database
CREATE OR REPLACE DATABASE feedback_demo;
USE DATABASE feedback_demo;

--create schema
CREATE OR REPLACE SCHEMA hackathon;
USE SCHEMA hackathon;


--create user for development team
CREATE USER FE_DEV
PASSWORD = 'xxxxxxxxx'
DEFAULT_ROLE = FE_DEV_ROLE
DEFAULT_WAREHOUSE = COMPUTE_WH
MUST_CHANGE_PASSWORD = TRUE;

--grant permissions
GRANT ROLE FE_DEV_ROLE TO USER FE_DEV;

-- Allow table creation in the schema
GRANT CREATE TABLE ON SCHEMA FEEDBACK_DEMO.HACKATHON TO ROLE FE_DEV_ROLE;
 
-- Allow insert/select on all tables in schema
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA FEEDBACK_DEMO.HACKATHON TO FE_DEV_ROLE;
 
-- Also ensure future tables are accessible
GRANT SELECT, INSERT, UPDATE, DELETE ON FUTURE TABLES IN SCHEMA FEEDBACK_DEMO.HACKATHON TO FE_DEV_ROLE;

--create raw data table
create or replace TABLE FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK (
	FEEDBACK_ID NUMBER(38,0),
	FEEDBACK_ACTIVITY VARCHAR(16777216),
	COURSE_ID NUMBER(38,0),
	COURSE_NAME VARCHAR(16777216),
	QUESTION VARCHAR(16777216),
	FEEDBACK_TYPE VARCHAR(16777216),
	RESPONSE VARCHAR(16777216),
	SUBMITTED_AT TIMESTAMP_NTZ(9),
	USER_ID NUMBER(38,0),
	USERNAME VARCHAR(16777216),
	FIRSTNAME VARCHAR(16777216),
	LASTNAME VARCHAR(16777216),
	EMAIL VARCHAR(16777216),
	INSTRUCTOR_ID NUMBER(38,0),
	INSTRUCTOR_NAME VARCHAR(16777216)
);

--- Creating a base table for this MOODLE_FEEDBACK, with one row per course_id and feedback_id combination ---
CREATE OR REPLACE TABLE FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_TRANSFORM (
    FEEDBACK_ID STRING,
    COURSE_ID STRING,
    COURSE_NAME STRING,
    TEXT_RESPONSE STRING,
    NUMERIC_RESPONSE INT,
    SUBMITTED_AT TIMESTAMP_NTZ,
    USER_ID STRING,
    USERNAME STRING,
    INSTRUCTOR_ID STRING,
    INSTRUCTOR_NAME STRING
);


INSERT INTO FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_TRANSFORM
SELECT * FROM 
(
SELECT 
s1.feedback_id,
s1.course_id,
s1.course_name,
s1.response as text_response,
s2.response as numeric_response,
s1.submitted_at,
s1.user_id,
s1.username,
s1.instructor_id,
s1.instructor_name
FROM 
MOODLE_FEEDBACK s1
LEFT JOIN MOODLE_FEEDBACK s2
ON s1.course_id = s2.course_id
AND s1.user_id = s2.user_id
HAVING s1.COURSE_NAME IN ('Data Science for Dummies', 'Big Data', 'Statistics for Data Science','Python Fundamentals','Introduction to Machine Learning')
AND s1.feedback_type IN ('texfield', 'textfield') AND s2.feedback_type IN ('numeric')
);

--- We now create an AI augmented table, utilising SNOWFLAKE.CORTEX ---

CREATE OR REPLACE TABLE FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG (
    FEEDBACK_ID STRING,
    COURSE_ID STRING,
    COURSE_NAME STRING,
    USER_ID STRING,
    USERNAME STRING,
    INSTRUCTOR_ID STRING,
    INSTRUCTOR_NAME STRING,
    TEXT_RESPONSE STRING,
    NUMERIC_RESPONSE INT,
    SENTIMENT_RAW STRING,
    SENTIMENT_LABEL STRING,
    SENTIMENT_SCORE_PERCENT FLOAT,
    URGENCY_FLAG BOOLEAN,
    THEMES STRING,
    ACTIONABLE_SUGGESTION STRING,
    RESPONSE_EMBEDDING VECTOR(FLOAT, 768),
    PROCESSED_AT TIMESTAMP_NTZ
);

--- Inserting into AI augmented table --- 
INSERT INTO FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG
SELECT *
FROM (
  WITH s AS (
SELECT
      FEEDBACK_ID,
      COURSE_ID,
      COURSE_NAME,
      TEXT_RESPONSE,
      NUMERIC_RESPONSE,
      USER_ID,
      USERNAME,
      INSTRUCTOR_ID,
      INSTRUCTOR_NAME,
      SNOWFLAKE.CORTEX.SENTIMENT(TEXT_RESPONSE) AS SENT_RAW,
      -- Extract single theme keyword
      CASE 
        WHEN TEXT_RESPONSE is not null THEN
      TRIM(UPPER(
        SNOWFLAKE.CORTEX.COMPLETE(
          'llama3-8b',
          CONCAT(
           'Extract ONLY ONE relevant theme keyword from the feedback (choose one of: CONTENT, PLATFORM, INSTRUCTOR, EXPERIENCE, OTHER). Answer with just the keyword: ',
            TEXT_RESPONSE
          )
        )))::STRING
        ELSE NULL
        END AS THEME_RAW,
      -- Generate actionable suggestion (only for non null text responses)
      CASE 
        WHEN TEXT_RESPONSE is not null THEN
          SNOWFLAKE.CORTEX.COMPLETE(
            'llama3-8b',
            CONCAT(
              'Provide ONE actionable suggestion (one short sentence) based on this feedback: ',
              TEXT_RESPONSE
            )
          )::STRING
        ELSE NULL
      END AS SUGG_RAW,
      -- Add embedding column using normalized theme + suggestion
      SNOWFLAKE.CORTEX.EMBED_TEXT_768(
        'snowflake-arctic-embed-m-v1.5',
        TEXT_RESPONSE || ' Sentiment: ' || SNOWFLAKE.CORTEX.SENTIMENT(TEXT_RESPONSE) ||
        ' Suggestion: ' || 
          COALESCE(
            CASE 
              WHEN TEXT_RESPONSE is not null THEN
                SNOWFLAKE.CORTEX.COMPLETE(
                  'llama3-8b',
                  CONCAT('Provide ONE actionable suggestion (one short sentence) based on this feedback, and please dont preface it with any text, such as "Here is one actionable suggestion:": ', TEXT_RESPONSE)
                )
              ELSE ''
            END, ''
          ) ||
        ' Theme: ' || 
          TRIM(UPPER(
            SNOWFLAKE.CORTEX.COMPLETE(
              'llama3-8b',
              CONCAT('Extract ONLY ONE relevant theme keyword (CONTENT, PLATFORM, INSTRUCTOR, EXPERIENCE, OTHER). Answer with just the keyword: ', TEXT_RESPONSE)
            )
          ))
      ) AS RESPONSE_EMBEDDING
    FROM FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_TRANSFORM
  )
  SELECT
    FEEDBACK_ID,
    COURSE_ID,
    COURSE_NAME,
    USER_ID,
    USERNAME,
    INSTRUCTOR_ID,
    INSTRUCTOR_NAME,
    TEXT_RESPONSE AS REVIEW_TEXT,
    NUMERIC_RESPONSE AS REVIEW_SCORE,
    SENT_RAW AS SENTIMENT_RAW,
    CASE
      WHEN TRY_CAST(SENT_RAW AS FLOAT) IS NOT NULL THEN
        CASE
          WHEN TRY_CAST(SENT_RAW AS FLOAT) < 0.3 THEN 'negative'
          WHEN TRY_CAST(SENT_RAW AS FLOAT) > 0.7 THEN 'positive'
          ELSE 'neutral'
        END
      WHEN LOWER(TO_VARCHAR(SENT_RAW)) IN ('negative','neutral','positive') 
        THEN LOWER(TO_VARCHAR(SENT_RAW))
      ELSE 'neutral'
    END AS SENTIMENT_LABEL,
    ROUND(
      CASE
        WHEN TRY_CAST(SENT_RAW AS FLOAT) IS NOT NULL
          THEN LEAST(GREATEST(TRY_CAST(SENT_RAW AS FLOAT),0),1) * 100
        WHEN LOWER(TO_VARCHAR(SENT_RAW)) = 'positive' THEN 80
        WHEN LOWER(TO_VARCHAR(SENT_RAW)) = 'neutral'  THEN 50
        WHEN LOWER(TO_VARCHAR(SENT_RAW)) = 'negative' THEN 20
        ELSE 0
      END,
      2
    ) AS SENTIMENT_SCORE_PERCENT,
    CASE
      WHEN LOWER(TO_VARCHAR(SENT_RAW)) = 'negative'
           AND (TRY_CAST(SENT_RAW AS FLOAT) IS NOT NULL AND TRY_CAST(SENT_RAW AS FLOAT) > 0.85)
      THEN TRUE
      ELSE FALSE
    END AS URGENCY_FLAG,
    REPLACE(THEME_RAW, '"', '') AS THEMES,  -- single theme keyword
    REPLACE(SUGG_RAW, '"', '') AS ACTIONABLE_SUGGESTION, -- null if text response null
    RESPONSE_EMBEDDING,
    CURRENT_TIMESTAMP() AS PROCESSED_AT
  FROM s
);

--- Creating a table for feedback , with one row per course_id and instructor_id combination---
CREATE OR REPLACE TABLE FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG_COURSE (
    COURSE_ID STRING,
    COURSE_NAME STRING,
    INSTRUCTOR_ID STRING,
    INSTRUCTOR_NAME STRING,
    CONCAT_RESPONSE STRING,
    OVERVIEW_FEEDBACK STRING
);


--- Creating AI summary of all feedback per course --- 
INSERT INTO FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG_COURSE
SELECT *
FROM (
  WITH s AS (
    SELECT
      COURSE_ID,
      COURSE_NAME,
      INSTRUCTOR_ID,
      INSTRUCTOR_NAME,
      LISTAGG(TEXT_RESPONSE, '-- ') AS CONCAT_RESPONSE
    FROM FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG
    GROUP BY       COURSE_ID, COURSE_NAME, INSTRUCTOR_ID, INSTRUCTOR_NAME    
  )
  SELECT
    COURSE_ID,
    COURSE_NAME,
    INSTRUCTOR_ID,
    INSTRUCTOR_NAME,
    CONCAT_RESPONSE,
    SNOWFLAKE.CORTEX.COMPLETE(
    'llama3-8b',
    CONCAT(
      'You are being provided with a field that is all of the feedback from students on a particular course.
      We have attempted to create a single field, CONCAT_RESPONSE, which contains all of the feedback.
      The delimiter between different pieces of feedback is a --, if you dont see any --, it means there is only one piece of feedback.
      Please summarise these responses into an overview of the opinions of the students.
      Please dont mention the name of the field CONCAT_RESPONSE, or indicate your feelings about performing this task',
      CONCAT_RESPONSE
    )
  )::STRING AS SUGG_RAW,
  FROM s
)
;

--- Creating a table for feedback , with one row per course_id and instructor_id combination---
CREATE OR REPLACE TABLE FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_ACT_INS_COURSE (
    COURSE_ID STRING,
    COURSE_NAME STRING,
    INSTRUCTOR_ID STRING,
    INSTRUCTOR_NAME STRING,
    CONCAT_ACT_INS STRING,
    OVERVIEW_ACT_INS STRING
);


--- Creating AI summary of all actionable insights per course --- 
INSERT INTO FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_ACT_INS_COURSE
SELECT *
FROM (
  WITH s AS (
    SELECT
      COURSE_ID,
      COURSE_NAME,
      INSTRUCTOR_ID,
      INSTRUCTOR_NAME,
      LISTAGG(ACTIONABLE_SUGGESTION, '-- ') AS CONCAT_ACT_INS
    FROM FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG
    GROUP BY       COURSE_ID, COURSE_NAME, INSTRUCTOR_ID, INSTRUCTOR_NAME    
  )
  SELECT
    COURSE_ID,
    COURSE_NAME,
    INSTRUCTOR_ID,
    INSTRUCTOR_NAME,
    CONCAT_ACT_INS,
    SNOWFLAKE.CORTEX.COMPLETE(
    'llama3-8b',
    CONCAT(
      'You are being provided with a field that is all of the actionable insights that our RAG Agent has produced, based on student feedback on a particular course.
      We have attempted to create a single field, CONCAT_ACT_INS, which contains all of the feedback.
      Please focus on items that particularly stop the students from learning, and insights that are mentioned multiple choices
      The delimiter between different pieces of feedback is a --, if you dont see any --, it means there is only one piece of feedback.
      Please summarise these responses into five individual and detailed feedbacks.
      Please dont mention the name of the field CONCAT_ACT_INS, or indicate your feelings about performing this task',
      CONCAT_ACT_INS
    )
  )::STRING AS OVERVIEW_ACT_INS,
  FROM s
)
;


--- Creating a table for feedback for the overall course ---
CREATE OR REPLACE TABLE FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG_OVERALL (
    CONCAT_RESPONSE STRING,
    OVERVIEW_FEEDBACK STRING
);

--- Creating AI summary of all feedback per course --- 
INSERT INTO FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG_OVERALL
SELECT *
FROM (
  WITH s AS (
    SELECT
      LISTAGG(TEXT_RESPONSE, '-- ') AS CONCAT_RESPONSE
    FROM FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG
    WHERE NUMERIC_RESPONSE IN (3,4,5)
  )
  SELECT
    CONCAT_RESPONSE,
    SNOWFLAKE.CORTEX.COMPLETE(
    'llama3-8b',
    CONCAT(
      'You are being provided with a field that is all of the feedback from students across all courses.
      We have attempted to create a single field, CONCAT_RESPONSE, which contains all of the feedback.
      The delimiter between different pieces of feedback is a --, if you dont see any --, it means there is only one piece of feedback.
      Please summarise these responses into an overview of the opinions of the students.
      Please dont mention the name of the field CONCAT_RESPONSE, or indicate your feelings about performing this task',
      CONCAT_RESPONSE
    )
  )::STRING AS SUGG_RAW,
  FROM s
)
;

--- Creating a table for feedback of the course overall ---
CREATE OR REPLACE TABLE FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_ACT_INS_OVERALL (
    CONCAT_ACT_INS STRING,
    OVERVIEW_ACT_INS STRING
);


--- Creating AI summary of all feedback per course --- 
INSERT INTO FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_ACT_INS_OVERALL
SELECT *
FROM (
  WITH s AS (
    SELECT
      LISTAGG(ACTIONABLE_SUGGESTION, '-- ') AS CONCAT_ACT_INS
    FROM FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG
    WHERE NUMERIC_RESPONSE IN (4,5)
  )
  SELECT
    CONCAT_ACT_INS,
    SNOWFLAKE.CORTEX.COMPLETE(
    'llama3-8b',
    CONCAT(
      'You are being provided with a field that is all of the actionable insights that our RAG Agent has produced, based on student feedback on across all the courses that we offer.
      We have attempted to create a single field, CONCAT_ACT_INS, which contains all of the feedback.
      Please focus on items that particularly stop the students from learning, and insights that are mentioned multiple choices
      The delimiter between different pieces of feedback is a --, if you dont see any --, it means there is only one piece of feedback.
      Please summarise these responses into five individual and detailed feedbacks.
      Please dont mention the name of the field CONCAT_ACT_INS, or indicate your feelings about performing this task',
      CONCAT_ACT_INS
    )
  )::STRING AS OVERVIEW_ACT_INS,
  FROM s
)
;
--creating stream and task with accountadmin as they have access to execute command and then granted access to accountadmin the key data tables for scheduled execution
use role accountadmin;
grant all privileges on table FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_TRANSFORM to role accountadmin;

grant all privileges on table FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG to role accountadmin;
grant all privileges on table FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG_COURSE to role accountadmin;

grant all privileges on table FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_ACT_INS_COURSE to role accountadmin;

grant all privileges on table FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG_OVERALL to role accountadmin;

grant all privileges on table FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_ACT_INS_OVERALL to role accountadmin;

--streaming data script
CREATE OR REPLACE STREAM FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_STREAM
ON TABLE FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK
APPEND_ONLY = TRUE;
-- =========================================
-- Task: Transform raw feedback
-- =========================================
CREATE OR REPLACE TASK FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_TRANSFORM
WAREHOUSE = COMPUTE_WH
SCHEDULE = 'USING CRON * * * * *UTC'
AS
INSERT INTO FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_TRANSFORM
SELECT 
    s1.feedback_id::STRING,
    s1.course_id::STRING,
    s1.course_name,
    s1.response AS text_response,
    s2.response::INT AS numeric_response,
    s1.submitted_at,
    s1.user_id::STRING,
    s1.username,
    s1.instructor_id::STRING,
    s1.instructor_name
FROM FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_STREAM s1
LEFT JOIN FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_STREAM s2
  ON s1.course_id = s2.course_id
  AND s1.user_id = s2.user_id
WHERE s1.course_name IN ('Data Science for Dummies', 'Big Data', 'Statistics for Data Science','Python Fundamentals','Introduction to Machine Learning')
  AND s1.feedback_type IN ('textfield')
  AND s2.feedback_type = 'numeric';
 
 
 -- =========================================
-- Task: Populate AI-augmented feedback
-- =========================================
CREATE OR REPLACE TASK FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_AI_AUG
WAREHOUSE = MY_WH
AFTER FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_TRANSFORM
AS
-- Insert AI enriched feedback
INSERT INTO FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG
SELECT *
FROM (
  WITH s AS (
    SELECT
      FEEDBACK_ID,
      COURSE_ID,
      COURSE_NAME,
      TEXT_RESPONSE,
      NUMERIC_RESPONSE,
      USER_ID,
      USERNAME,
      INSTRUCTOR_ID,
      INSTRUCTOR_NAME,
      SNOWFLAKE.CORTEX.SENTIMENT(TEXT_RESPONSE) AS SENT_RAW,
      -- Extract single theme keyword
      CASE 
        WHEN TEXT_RESPONSE IS NOT NULL THEN
          TRIM(UPPER(
            SNOWFLAKE.CORTEX.COMPLETE(
              'llama3-8b',
              CONCAT(
                'Extract ONLY ONE relevant theme keyword from the feedback (choose one of: CONTENT, PLATFORM, INSTRUCTOR, EXPERIENCE, OTHER). Answer with just the keyword: ',
                TEXT_RESPONSE
              )
            )
          ))::STRING
        ELSE NULL
      END AS THEME_RAW,
      -- Generate actionable suggestion (only for non null text responses)
      CASE 
        WHEN TEXT_RESPONSE IS NOT NULL THEN
          SNOWFLAKE.CORTEX.COMPLETE(
            'llama3-8b',
            CONCAT(
              'Provide ONE actionable suggestion (one short sentence) based on this feedback: ',
              TEXT_RESPONSE
            )
          )::STRING
        ELSE NULL
      END AS SUGG_RAW,
      -- Add embedding column using normalized theme + suggestion
      SNOWFLAKE.CORTEX.EMBED_TEXT_768(
        'snowflake-arctic-embed-m-v1.5',
        TEXT_RESPONSE || ' Sentiment: ' || SNOWFLAKE.CORTEX.SENTIMENT(TEXT_RESPONSE) ||
        ' Suggestion: ' || 
          COALESCE(
            CASE 
              WHEN TEXT_RESPONSE IS NOT NULL THEN
                SNOWFLAKE.CORTEX.COMPLETE(
                  'llama3-8b',
                  CONCAT('Provide ONE actionable suggestion (one short sentence) based on this feedback, and please dont preface it with any text, such as "Here is one actionable suggestion:": ', TEXT_RESPONSE)
                )
              ELSE ''
            END, ''
          ) ||
        ' Theme: ' || 
          TRIM(UPPER(
            SNOWFLAKE.CORTEX.COMPLETE(
              'llama3-8b',
              CONCAT('Extract ONLY ONE relevant theme keyword (CONTENT, PLATFORM, INSTRUCTOR, EXPERIENCE, OTHER). Answer with just the keyword: ', TEXT_RESPONSE)
            )
          ))
      ) AS RESPONSE_EMBEDDING
    FROM FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_TRANSFORM
  ),
  mapped AS (
    SELECT
      *,
      -- derive clean label
      CASE
        WHEN TRY_CAST(SENT_RAW AS FLOAT) IS NOT NULL THEN
          CASE
            WHEN TRY_CAST(SENT_RAW AS FLOAT) < -0.2 THEN 'negative'
            WHEN TRY_CAST(SENT_RAW AS FLOAT) > 0 THEN 'positive'
            ELSE 'neutral'
          END
        WHEN LOWER(TO_VARCHAR(SENT_RAW)) IN ('negative','neutral','positive')
          THEN LOWER(TO_VARCHAR(SENT_RAW))
        ELSE 'neutral'
      END AS SENTIMENT_LABEL,
      -- derive clean numeric score [0–1]
      CASE
        WHEN TRY_CAST(SENT_RAW AS FLOAT) IS NOT NULL
          THEN LEAST(GREATEST(TRY_CAST(SENT_RAW AS FLOAT),0),1)
        WHEN LOWER(TO_VARCHAR(SENT_RAW)) = 'positive' THEN 0.8
        WHEN LOWER(TO_VARCHAR(SENT_RAW)) = 'neutral'  THEN 0.5
        WHEN LOWER(TO_VARCHAR(SENT_RAW)) = 'negative' THEN 0.2
        ELSE 0
      END AS SENTIMENT_SCORE
    FROM s
  )
  SELECT
    FEEDBACK_ID,
    COURSE_ID,
    COURSE_NAME,
    USER_ID,
    USERNAME,
    INSTRUCTOR_ID,
    INSTRUCTOR_NAME,
    TEXT_RESPONSE AS REVIEW_TEXT,
    NUMERIC_RESPONSE AS REVIEW_SCORE,
    SENT_RAW AS SENTIMENT_RAW,
    SENTIMENT_LABEL,
    ROUND(SENTIMENT_SCORE * 100, 2) AS SENTIMENT_SCORE_PERCENT,
    CASE
      WHEN SENTIMENT_LABEL = 'negative'
           AND SENTIMENT_SCORE > 0.15
      THEN TRUE
      ELSE FALSE
    END AS URGENCY_FLAG,
    REPLACE(THEME_RAW, '"', '') AS THEMES,
    REPLACE(SUGG_RAW, '"', '') AS ACTIONABLE_SUGGESTION,
    RESPONSE_EMBEDDING,
    CURRENT_TIMESTAMP() AS PROCESSED_AT
  FROM mapped
);

-- =========================================
-- Task: Summarize AI feedback per course
-- =========================================
CREATE OR REPLACE TASK FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_AI_COURSE
WAREHOUSE = MY_WH
AFTER FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_AI_AUG
AS
INSERT INTO FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG_COURSE
SELECT *
FROM (
  WITH s AS (
    SELECT COURSE_ID, COURSE_NAME, INSTRUCTOR_ID, INSTRUCTOR_NAME,
           LISTAGG(TEXT_RESPONSE, '-- ') AS CONCAT_RESPONSE
    FROM FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG
    GROUP BY COURSE_ID, COURSE_NAME, INSTRUCTOR_ID, INSTRUCTOR_NAME
  )
  SELECT COURSE_ID, COURSE_NAME, INSTRUCTOR_ID, INSTRUCTOR_NAME, CONCAT_RESPONSE,
         SNOWFLAKE.CORTEX.COMPLETE('llama3-8b', CONCAT('Summarize into an overview of opinions: ', CONCAT_RESPONSE))::STRING AS OVERVIEW_FEEDBACK
  FROM s
);

-- =========================================
-- Task: Summarize actionable insights per course
-- =========================================
CREATE OR REPLACE TASK FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_AI_ACT_INS_COURSE
WAREHOUSE = COMPUTE_WH
AFTER FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_AI_COURSE
AS
INSERT INTO FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_ACT_INS_COURSE
SELECT *
FROM (
  WITH s AS (
    SELECT COURSE_ID, COURSE_NAME, INSTRUCTOR_ID, INSTRUCTOR_NAME,
           LISTAGG(ACTIONABLE_SUGGESTION, '-- ') AS CONCAT_ACT_INS
    FROM FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG
    GROUP BY COURSE_ID, COURSE_NAME, INSTRUCTOR_ID, INSTRUCTOR_NAME
  )
  SELECT COURSE_ID, COURSE_NAME, INSTRUCTOR_ID, INSTRUCTOR_NAME, CONCAT_ACT_INS,
         SNOWFLAKE.CORTEX.COMPLETE('llama3-8b', CONCAT('Summarize into five detailed actionable insights: ', CONCAT_ACT_INS))::STRING AS OVERVIEW_ACT_INS
  FROM s
);

-- =========================================
-- Task: Overall feedback summary
-- =========================================
CREATE OR REPLACE TASK FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_AI_OVERALL
WAREHOUSE = COMPUTE_WH
AFTER FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_AI_ACT_INS_COURSE
AS
-- Overall feedback across all courses
INSERT INTO FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG_OVERALL
SELECT *
FROM (
  WITH s AS (
    SELECT LISTAGG(TEXT_RESPONSE, '-- ') AS CONCAT_RESPONSE
    FROM FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG
    WHERE NUMERIC_RESPONSE IN (3,4,5)
  )
  SELECT CONCAT_RESPONSE,
         SNOWFLAKE.CORTEX.COMPLETE('llama3-8b', CONCAT('Summarize into an overall opinion overview: ', CONCAT_RESPONSE))::STRING AS OVERVIEW_FEEDBACK
  FROM s
);

-- =========================================
-- Task: Overall actionable insights summary
-- =========================================
CREATE OR REPLACE TASK FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_AI_ACT_INS_OVERALL
WAREHOUSE = COMPUTE_WH
AFTER FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_AI_OVERALL
AS
INSERT INTO FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_ACT_INS_OVERALL
SELECT *
FROM (
  WITH s AS (
    SELECT LISTAGG(ACTIONABLE_SUGGESTION, '-- ') AS CONCAT_ACT_INS
    FROM FEEDBACK_DEMO.HACKATHON.MOODLE_FEEDBACK_AI_AUG
    WHERE NUMERIC_RESPONSE IN (4,5)
  )
  SELECT CONCAT_ACT_INS,
         SNOWFLAKE.CORTEX.COMPLETE('llama3-8b', CONCAT('Summarize into five overall actionable insights: ', CONCAT_ACT_INS))::STRING AS OVERVIEW_ACT_INS
  FROM s
);

-- =========================================
-- Resume all tasks
-- =========================================
ALTER TASK FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_TRANSFORM RESUME;
ALTER TASK FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_AI_AUG RESUME;
ALTER TASK FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_AI_COURSE RESUME;
ALTER TASK FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_AI_ACT_INS_COURSE RESUME;
ALTER TASK FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_AI_OVERALL RESUME;
ALTER TASK FEEDBACK_DEMO.HACKATHON.TASK_FEEDBACK_AI_ACT_INS_OVERALL RESUME;







