<?php
$observers = [
    [
        'eventname'   => '\mod_feedback\event\response_submitted',
        'callback'    => 'local_feedforward_observer::feedback_submitted',
        'includefile' => '/local/feedforward/observer.php',
        'priority'    => 9999,
        'internal'    => false,
    ],
];
