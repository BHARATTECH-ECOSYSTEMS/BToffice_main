@echo off
setlocal

echo ===================================================
echo Starting Chatwoot Self-Hosted (Docker Compose)
echo ===================================================

cd /d "%~dp0"

if not exist ".env" (
    echo [ERROR] .env file not found! Copying from .env.example...
    copy .env.example .env
)

echo.
echo Pulling images and running database prepare check...
docker compose run --rm rails bundle exec rails db:chatwoot_prepare

echo.
echo Starting Chatwoot services in background...
docker compose up -d

echo.
echo ===================================================
echo Chatwoot is starting!
echo Access URL: http://localhost:3000
echo Keycloak SSO Client: chatwoot-client
echo Check status with: docker compose ps
echo View logs with:    docker compose logs -f
echo ===================================================
pause
