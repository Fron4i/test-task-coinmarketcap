<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\CoinService;

return function (\Slim\App $app) {
    $app->get('/coins', function (Request $request, Response $response) {
        $service = new CoinService();
        $coins = $service->getCoins();
        $response->getBody()->write(json_encode($coins));
        return $response->withHeader('Content-Type', 'application/json');
    });

    $app->post('/refresh', function (Request $request, Response $response) {
        $service = new CoinService();
        $result = $service->refreshCoins();
        if (!$result) {
            $response = $response->withStatus(429);
            $response->getBody()->write(json_encode(['error' => 'Rate limit exceeded, try later']));
        } else {
            $response->getBody()->write(json_encode(['status' => 'ok']));
        }
        return $response->withHeader('Content-Type', 'application/json');
    });

    $app->get('/chart/{symbol}', function(Request $request, Response $response, array $args) {
        $days = (int)($request->getQueryParams()['days'] ?? 7);
        if ($days < 1 || $days > 30) $days = 7;
        $service = new CoinService();
        try {
            $data = $service->getChartData($args['symbol'], $days);
            $response->getBody()->write(json_encode($data));
        } catch (\Throwable $e) {
            return $response->withStatus(400);
        }
        return $response->withHeader('Content-Type','application/json');
    });
}; 