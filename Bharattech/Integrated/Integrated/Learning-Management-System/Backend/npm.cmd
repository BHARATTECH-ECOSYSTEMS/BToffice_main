@echo off
setlocal
set "NODE_EXE=%NODE_EXE%"
if not defined NODE_EXE set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

if /I "%~1"=="start" (
  "%NODE_EXE%" "%~dp0server.js"
  exit /b %ERRORLEVEL%
)

if /I "%~1"=="run" if /I "%~2"=="dev" (
  "%NODE_EXE%" --watch "%~dp0server.js"
  exit /b %ERRORLEVEL%
)

echo This local wrapper supports: npm start, npm run dev
echo Install Node.js from https://nodejs.org/ for the full npm CLI.
exit /b 1
