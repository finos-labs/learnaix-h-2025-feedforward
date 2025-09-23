<?php
defined('MOODLE_INTERNAL') || die();

class local_feedbacktrigger_observer {
    public static function feedback_submitted(\mod_feedback\event\response_submitted $event) {
        global $DB;

        $completedid = $event->objectid;  // feedback_completed.id
        $userid      = $event->userid;
        $courseid    = $event->courseid;

        // Get completed feedback entry
        $completed = $DB->get_record('feedback_completed', ['id' => $completedid]);

        // Get course
        $course = $DB->get_record('course', ['id' => $courseid]);

        // Get feedback activity
        $feedback = $DB->get_record('feedback', ['id' => $completed->feedback]);

        // Get user who submitted feedback
        $user = $DB->get_record('user', ['id' => $userid]);

        // Get instructor (first editingteacher assigned to this course)
        $sql = "SELECT u.id, u.firstname, u.lastname
                  FROM {role_assignments} ra
                  JOIN {context} ctx ON ra.contextid = ctx.id
                  JOIN {user} u ON ra.userid = u.id
                 WHERE ctx.instanceid = :courseid
                   AND ctx.contextlevel = 50  -- 50 = CONTEXT_COURSE
                   AND ra.roleid = 3          -- 3 = editingteacher role (adjust if needed)
                 LIMIT 1";
        $instructor = $DB->get_record_sql($sql, ['courseid' => $courseid]);

        // Get responses
        $sql = "SELECT i.id as itemid, i.name as question, i.typ as feedback_type, v.value as response
                  FROM {feedback_value} v
                  JOIN {feedback_item} i ON v.item = i.id
                 WHERE v.completed = :completedid";
        $responses = $DB->get_records_sql($sql, ['completedid' => $completedid]);

        // Build payload
        $payload = [
            'feedback' => [
                'id'   => $feedback->id,
                'name' => $feedback->name,
            ],
            'course' => [
                'id'   => $course->id,
                'name' => $course->fullname,
            ],
            'user' => [
                'id'        => $user->id,
                'username'  => $user->username,
                'firstname' => $user->firstname,
                'lastname'  => $user->lastname,
                'email'     => $user->email,
            ],
            'instructor' => [
                'id'   => $instructor ? $instructor->id : null,
                'name' => $instructor ? ($instructor->firstname . ' ' . $instructor->lastname) : null,
            ],
            'submitted_at' => $completed->timemodified,
            'responses'    => array_values($responses),
        ];

        // Send to Next.js API
        $url = "http://nextjs-app:3000/api/trigger";  // inside docker network
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
        $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if (curl_errno($ch)) {
            error_log("❌ CURL error: " . curl_error($ch));
        } else {
            error_log("✅ Sent feedback submission to API, HTTP $httpcode, response: $response");
        }

        curl_close($ch);
    }
}
