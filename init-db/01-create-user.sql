DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles WHERE rolname = 'moodle'
   ) THEN
      CREATE ROLE moodle WITH LOGIN PASSWORD 'moodlepass';
   END IF;
END
$do$;

ALTER USER moodle WITH PASSWORD 'moodlepass';
