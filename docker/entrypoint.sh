#!/usr/bin/env sh
set -e

# Generate config.php from environment variables if it does not exist
if [ ! -f /app/config.php ]; then
  cat > /app/config.php <<'PHP'
<?php
return [
    'db' => [
        'host' => getenv('DB_HOST') ?: 'db',
        'port' => (int)(getenv('DB_PORT') ?: 5432),
        'name' => getenv('DB_NAME') ?: 'crypto',
        'user' => getenv('DB_USER') ?: 'postgres',
        'pass' => getenv('DB_PASS') ?: 'postgres',
    ],
];
PHP
fi

echo "Starting PHP server on 0.0.0.0:8000"
php -S 0.0.0.0:8000 -t public public/router.php 