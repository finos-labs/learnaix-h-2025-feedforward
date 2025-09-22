<?php
defined('MOODLE_INTERNAL') || die();

class local_feedbacktrigger_observer {
    public static function feedback_submitted(\mod_feedback\event\response_submitted $event) {
        global $DB;

        $completedid = $event->objectid;
        $userid      = $event->userid;
        $courseid    = $event->courseid;

        $completed = $DB->get_record('feedback_completed', ['id' => $completedid]);

        $course = $DB->get_record('course', ['id' => $courseid]);

        $feedback = $DB->get_record('feedback', ['id' => $completed->feedback]);

        $user = $DB->get_record('user', ['id' => $userid]);

        $sql = "SELECT i.id as itemid, i.name as question, i.typ as feedback_type, v.value as response
                  FROM {feedback_value} v
                  JOIN {feedback_item} i ON v.item = i.id
                 WHERE v.completed = :completedid";
        $responses = $DB->get_records_sql($sql, ['completedid' => $completedid]);

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
            'submitted_at' => $completed->timemodified,
            'responses'    => array_values($responses),
        ];

        $url = "http://nextjs-app:3000/api/trigger";
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
        $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if (curl_errno($ch)) {
            error_log("API error: " . curl_error($ch));
        } else {
            error_log("Sent feedback submission to API, HTTP $httpcode, response: $response");
        }

        curl_close($ch);
    }
}
