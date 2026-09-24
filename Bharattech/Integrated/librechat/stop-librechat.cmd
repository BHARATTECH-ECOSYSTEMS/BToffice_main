@echo off
setlocal

echo ===================================================
echo        BharatTech - Stopping LibreChat AI Service
echo ===================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo [INFO] Stopping LibreChat containers...
docker compose down

if %errorlevel% equ 0 (
    echo [SUCCESS] LibreChat containers stopped cleanly.
) else (
    echo [WARNING] Could not stop containers. Verify docker status.
)

echo.
pause
