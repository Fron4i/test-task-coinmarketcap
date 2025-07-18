# Тестовое задание для PHP-разработчика

**Вакансия:** PHP-разработчик до 150 000 ₽ за месяц, на руки  
**Компания:** ИП Рыбаков Артем Владимирович

---

**Автор:** Илья (@iwebix_man, Telegram: +79787487800, email: ilya10306@mail.ru)

---

## Быстрый старт в Docker

### Установка Docker, если ещё не установлен

## ВАЖНО - перед началом установки НЕОБХОДИМО ОТКЛЮЧИТЬ VPN - иначе докер не сможет скачать свои компоненты!!!

1. **Windows / macOS** – скачайте и установите Docker Desktop с официального сайта:
   https://docs.docker.com/desktop/
2. **Ubuntu / Debian**
   ```bash
   sudo apt-get update
   sudo apt-get install -y ca-certificates curl gnupg lsb-release
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   sudo apt-get update
   sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   sudo usermod -aG docker $USER
   newgrp docker  # выйти/войти для применения
   sudo systemctl start docker
   ```
3. Проверьте:
   ```bash
   docker --version
   docker compose version
   ```

---

Требования: установлен Docker и Docker Compose v2.

1. Соберите и запустите контейнеры командой:

   ```bash
   docker compose up --build -d
   ```

   Будут подняты два сервиса:

   - **db** — PostgreSQL 15 (порт `5432`, данные тома `db-data`)
   - **app** — PHP 8.1 + Slim API + фронтенд (порт `8000`)

2. Откройте браузер и перейдите по адресу:
   `http://localhost:8000`

3. Чтобы остановить и удалить контейнеры с томом данных:

   ```bash
   docker compose down -v
   ```

### Переменные окружения

При необходимости вы можете изменить параметры БД, отредактировав их в `docker-compose.yml`.  
Скрипт `/entrypoint.sh` при старте контейнера **автоматически** генерирует `config.php` на основе этих переменных, поэтому файл конфигурации не хранится в репозитории.

---

## Описание проекта

Веб-приложение для просмотра топ-50 криптовалют по капитализации с актуальными ценами, изменением за 24ч, капитализацией и объёмом торгов. Данные берутся с CoinGecko API, сохраняются в PostgreSQL. Фронтенд — на чистом JS, адаптивная таблица, интерактивные графики (Chart.js), поддержка светлой/тёмной темы.

---

## Технологии

- **Backend:** PHP 8.1+, Slim 4, Guzzle, PostgreSQL, PSR-7, Composer
- **Frontend:** HTML5, CSS3 (SCSS), Vanilla JS, Chart.js
- **Dev tools:** Composer, Nodemon, SCSS

---

## Структура проекта

```
├── assets/
│   └── scss/
│       └── style.scss         # Исходные SCSS-стили
├── public/
│   ├── index.html            # Главная страница (таблица, кнопки, контейнеры)
│   ├── main.js               # Вся логика фронта: загрузка, сортировка, графики, темы
│   ├── style.css             # Скомпилированные стили (из SCSS)
│   ├── router.php            # Slim-friendly роутер для PHP built-in сервера
│   └── index.php             # Точка входа API (инициализация Slim, подключение маршрутов)
├── src/
│   ├── CoinService.php       # Главный сервис работы с данными (API, БД, бизнес-логика)
│   ├── routes.php            # Описание всех API-маршрутов
│   └── Core/
│       └── Database.php      # Singleton для подключения к PostgreSQL
├── config.php                # Конфиг подключения к БД (создаётся из example)
├── config.example.php        # Пример конфига
├── composer.json             # Зависимости и автозагрузка
├── composer.lock             # Зафиксированные версии пакетов
└── README.md                 # Документация
```

---

## Backend: описание логики и классов

### `src/Core/Database.php`

- **Класс:** `Database`
- **Назначение:** Singleton для подключения к PostgreSQL через PDO.
- **Методы:**
  - `getInstance()`: возвращает единственный экземпляр PDO, инициализируя его по данным из `config.php`.
- **Особенности:**
  - Проверяет наличие конфига, выбрасывает исключение при ошибке.
  - Использует параметры подключения из массива `db`.

### `src/CoinService.php`

- **Класс:** `CoinService`
- **Назначение:** Вся бизнес-логика работы с данными: загрузка с CoinGecko, кэширование, выдача данных, графики.
- **Методы:**
  - `__construct()`: инициализация HTTP-клиента и подключения к БД, создание таблицы при необходимости.
  - `refreshCoins()`: загружает топ-50 крипотовалют с CoinGecko, сохраняет/обновляет их в БД. Обрабатывает лимиты API (429).
  - `getCoins()`: возвращает массив данных из БД (символ, имя, цена, изменение, капитализация, объём).
  - `getChartData($symbol, $days)`: получает исторические цены крипотовалюты за N дней с CoinGecko (по cg_id из БД).
- **Особенности:**
  - Использует Guzzle для HTTP-запросов.
  - Все операции с БД через подготовленные выражения.
  - Автоматически создаёт таблицу `coins` при первом запуске.

### `src/routes.php`

- **Назначение:** Описывает все API-маршруты для Slim.
- **Маршруты:**
  - `GET /coins` — получить топ-50 крипотовалют (JSON)
  - `POST /refresh` — обновить данные с CoinGecko (JSON, 429 при лимите)
  - `GET /chart/{symbol}?days=N` — получить исторические цены крипотовалюты (по умолчанию 7 дней)
- **Особенности:**
  - Все ответы — JSON.
  - Обработка ошибок и лимитов API.

### `public/router.php`

- **Назначение:** Роутер для PHP built-in сервера. Отдаёт статику, index.html или проксирует API-запросы в Slim.

### `public/index.php`

- **Назначение:** Точка входа для Slim-приложения. Подключает автозагрузку, конфиг, middleware, маршруты.

### `config.php` / `config.example.php`

- **Назначение:** Конфиг подключения к PostgreSQL. Формат:

```php
return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 5432,
        'name' => 'crypto',
        'user' => 'postgres',
        'pass' => 'password',
    ],
];
```

---

## Frontend: описание логики и файлов

### `public/index.html`

- **Структура:**
  - Заголовок, кнопки обновления и смены темы, подсказка, таблица с крипотовалютами, подключение main.js и Chart.js.
  - Таблица: #, тикер, цена, 24ч, капитализация, объём.
  - Клик по строке — раскрывает график цены за 7 дней.

### `public/main.js`

- **Логика:**
  - Загрузка крипотовалют через `/coins`, отрисовка таблицы.
  - Сортировка по столбцам (клик по заголовку).
  - Кнопка обновления — POST `/refresh`, обработка ошибок (лимиты).
  - Клик по строке — запрос `/chart/{symbol}?days=7`, отрисовка графика (Chart.js).
  - Кэширование графиков, toast-уведомления.
  - Переключение темы (dark/light), динамическая смена цветов.

### `public/style.css` и `assets/scss/style.scss`

- **SCSS:**
  - Переменные для цветов, темная/светлая тема, градиенты, адаптивность.
  - Стилизация таблицы, кнопок, popup-графиков, toast-уведомлений.
  - Анимация градиента, поддержка кастомных свойств для динамики.
- **CSS:**
  - Скомпилированная версия SCSS для подключения в index.html.

---

## Зависимости (composer.json)

- **slim/slim** — микрофреймворк для API
- **slim/psr7** — реализация PSR-7
- **guzzlehttp/guzzle** — HTTP-клиент для работы с CoinGecko
- **vlucas/phpdotenv** — поддержка .env (опционально)
- **psr/_, symfony/polyfill-_** — интерфейсы и полифиллы

---

## Примечания

- Все данные кэшируются в PostgreSQL, чтобы не превышать лимиты CoinGecko.
- Для работы требуется PHP 8.1+, PostgreSQL, Composer.
- Фронтенд не использует фреймворки, только чистый JS и Chart.js.

---

**Автор:** Илья (@iwebix_man, Telegram: +79787487800, email: ilya10306@mail.ru)
