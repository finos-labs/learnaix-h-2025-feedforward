<?php
$observers = [
    [
        'eventname'   => '\mod_feedback\event\response_submitted',
        'callback'    => 'local_feedbacktrigger_observer::feedback_submitted',
        'includefile' => '/local/feedbacktrigger/observer.php',
        'priority'    => 9999,
        'internal'    => false,
    ],
];
