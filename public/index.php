<?php

use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

if (file_exists(__DIR__ . '/../config.php')) {
} else {
    exit('Please copy config.example.php to config.php and configure database connection.');
}

$app = AppFactory::create();
$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();
$errorMiddleware = $app->addErrorMiddleware(true, true, true);

$routes = require __DIR__ . '/../src/routes.php';
$routes($app);

$app->run();
