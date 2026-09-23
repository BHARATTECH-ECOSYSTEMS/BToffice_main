@echo off
setlocal

set "ROOT=%~dp0"
set "CHATWOOT_DIR=%ROOT%..\chatwoot"

if exist "%CHATWOOT_DIR%\start-chatwoot.cmd" (
    call "%CHATWOOT_DIR%\start-chatwoot.cmd"
) else if exist "%CHATWOOT_DIR%" (
    cd /d "%CHATWOOT_DIR%"
    echo Starting Chatwoot with docker compose up -d...
    docker compose up -d
) else (
    echo [ERROR] Chatwoot directory not found at: %CHATWOOT_DIR%
    pause
)
