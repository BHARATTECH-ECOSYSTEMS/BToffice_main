@echo off
setlocal

set "ROOT=%~dp0"
set "SERVER_DIR=%ROOT%..\server"

if exist "%SERVER_DIR%\start-server.cmd" (
    call "%SERVER_DIR%\start-server.cmd"
) else if exist "%SERVER_DIR%" (
    cd /d "%SERVER_DIR%"
    echo Starting Server Screego with docker compose up -d...
    docker compose up -d
) else (
    echo [ERROR] Server directory not found at: %SERVER_DIR%
    pause
)
