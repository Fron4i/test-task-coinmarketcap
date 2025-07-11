<?php
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$path = __DIR__ . $uri;

if ($uri === '/' || $uri === '') {
    readfile(__DIR__ . '/index.html');
    return true;
}

if ($uri !== '/' && file_exists($path) && !is_dir($path)) {
    return false;
}

if (preg_match('#^/(coins|refresh|chart/)#', $uri)) {
    require __DIR__ . '/index.php';
    return true;
}

readfile(__DIR__ . '/index.html');
return true;
