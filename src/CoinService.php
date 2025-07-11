<?php

namespace App;

use GuzzleHttp\Client;
use PDO;
use DateTime;
use App\Core\Database;

class CoinService
{
    private Client $http;
    private PDO $db;

    public function __construct()
    {
        $this->http = new Client([
            'base_uri' => 'https://api.coingecko.com/api/v3/',
            'timeout'  => 10.0,
        ]);
        $this->db = Database::getInstance();
        $this->ensureTableExists();
    }

    private function ensureTableExists(): void
    {
        $sql = "CREATE TABLE IF NOT EXISTS coins (
            id SERIAL PRIMARY KEY,
            symbol TEXT UNIQUE,
            cg_id TEXT,
            name TEXT,
            price NUMERIC,
            change_24h NUMERIC,
            market_cap NUMERIC,
            volume_24h NUMERIC,
            last_updated TIMESTAMP
        );";
        $this->db->exec($sql);
    }

    public function refreshCoins(): bool
    {
        try {
            $response = $this->http->get('coins/markets', [
                'query' => [
                    'vs_currency' => 'rub',
                    'order' => 'market_cap_desc',
                    'per_page' => 50,
                    'page' => 1,
                ],
            ]);
        } catch (\GuzzleHttp\Exception\ClientException $e) {
            if ($e->getResponse() && $e->getResponse()->getStatusCode() === 429) {
                return false;
            }
            throw $e;
        }

        $data = json_decode($response->getBody()->getContents(), true);

        $sql = "INSERT INTO coins (symbol, cg_id, name, price, change_24h, market_cap, volume_24h, last_updated)
                VALUES (:symbol, :cg_id, :name, :price, :change_24h, :market_cap, :volume_24h, :last_updated)
                ON CONFLICT (symbol) DO UPDATE SET
                    price = EXCLUDED.price,
                    change_24h = EXCLUDED.change_24h,
                    market_cap = EXCLUDED.market_cap,
                    volume_24h = EXCLUDED.volume_24h,
                    last_updated = EXCLUDED.last_updated";
        $stmt = $this->db->prepare($sql);

        foreach ($data as $coin) {
            $stmt->execute([
                ':symbol' => $coin['symbol'],
                ':cg_id' => $coin['id'],
                ':name' => $coin['name'],
                ':price' => $coin['current_price'],
                ':change_24h' => $coin['price_change_percentage_24h'],
                ':market_cap' => $coin['market_cap'],
                ':volume_24h' => $coin['total_volume'],
                ':last_updated' => (new DateTime())->format('Y-m-d H:i:s'),
            ]);
        }
        return true;
    }

    public function getCoins(): array
    {
        $stmt = $this->db->query('SELECT symbol, name, price, change_24h, market_cap, volume_24h FROM coins ORDER BY market_cap DESC LIMIT 50');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $row['price'] = (float)$row['price'];
            $row['change_24h'] = (float)$row['change_24h'];
            $row['market_cap'] = (float)$row['market_cap'];
            $row['volume_24h'] = (float)$row['volume_24h'];
        }
        unset($row);
        return $rows;
    }

    public function getChartData(string $symbol, int $days = 7): array
    {
        $stmt = $this->db->prepare('SELECT cg_id FROM coins WHERE symbol = :symbol');
        $stmt->execute([':symbol' => strtolower($symbol)]);
        $cgId = $stmt->fetchColumn();
        if (!$cgId) {
            throw new \RuntimeException('Unknown symbol');
        }

        $resp = $this->http->get("coins/{$cgId}/market_chart", [
            'query' => [
                'vs_currency' => 'rub',
                'days' => $days,
            ],
        ]);
        $data = json_decode($resp->getBody()->getContents(), true);
        return $data['prices'] ?? [];
    }
}
