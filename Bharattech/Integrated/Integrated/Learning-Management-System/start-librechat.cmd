@echo off
setlocal

set "ROOT=%~dp0"
set "LIBRECHAT_DIR=%ROOT%..\..\librechat"

if exist "%LIBRECHAT_DIR%\start-librechat.cmd" (
    call "%LIBRECHAT_DIR%\start-librechat.cmd"
) else (
    echo [ERROR] LibreChat directory not found at: %LIBRECHAT_DIR%
    pause
)
