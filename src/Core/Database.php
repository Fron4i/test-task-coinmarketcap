<?php

namespace App\Core;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $instance = null;

    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            $configPath = __DIR__ . '/../../config.php';
            if (!file_exists($configPath)) {
                throw new \RuntimeException('config.php not found.');
            }
            $config = require $configPath;
            $db = $config['db'];
            $dsn = sprintf('pgsql:host=%s;port=%d;dbname=%s', $db['host'], $db['port'], $db['name']);

            try {
                self::$instance = new PDO($dsn, $db['user'], $db['pass'], [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]);
            } catch (PDOException $e) {
                throw new \RuntimeException('Database connection failed: ' . $e->getMessage());
            }
        }
        return self::$instance;
    }
} 