# syntax=docker/dockerfile:1
FROM php:8.1-cli-alpine

# Install required PHP extensions
RUN apk add --no-cache postgresql-dev git curl make autoconf g++ && \
    docker-php-ext-install pdo_pgsql

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy composer files first to leverage Docker layer caching
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress

# Copy application source code
COPY . .

# Copy entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

CMD ["/entrypoint.sh"] 