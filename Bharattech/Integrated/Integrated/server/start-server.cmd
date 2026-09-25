@echo off
setlocal

set "DIR=%~dp0"
cd /d "%DIR%"

echo ========================================================
echo    Starting BharatTech Server Screego Screen Share
echo ========================================================

if exist "%DIR%screego.exe" (
    echo [INFO] Found local screego binary. Launching...
    screego.exe --config screego.config.development
    goto :eof
)

echo [INFO] Launching Screego container via Docker Compose...
docker compose up -d
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Server is running!
    echo URL: http://localhost:5050
    echo Default Login credentials:
    echo   Username: admin
    echo   Password: admin
) else (
    echo [ERROR] Failed to start Docker container. Ensure Docker Desktop is running.
    pause
)
