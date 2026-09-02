@echo off
setlocal
set "NODE_EXE=%NODE_EXE%"
if not defined NODE_EXE set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

if /I "%~1"=="run" if /I "%~2"=="dev" (
  "%NODE_EXE%" "%~dp0node_modules\vite\bin\vite.js" --configLoader runner --host 0.0.0.0 --port 5173 --strictPort
  exit /b %ERRORLEVEL%
)

if /I "%~1"=="run" if /I "%~2"=="build" (
  "%NODE_EXE%" "%~dp0node_modules\vite\bin\vite.js" build --configLoader runner
  exit /b %ERRORLEVEL%
)

if /I "%~1"=="run" if /I "%~2"=="preview" (
  "%NODE_EXE%" "%~dp0node_modules\vite\bin\vite.js" preview --configLoader runner --host 0.0.0.0
  exit /b %ERRORLEVEL%
)

if /I "%~1"=="run" if /I "%~2"=="lint" (
  "%NODE_EXE%" "%~dp0node_modules\eslint\bin\eslint.js" .
  exit /b %ERRORLEVEL%
)

echo This local wrapper supports: npm run dev, npm run build, npm run preview, npm run lint
echo Install Node.js from https://nodejs.org/ for the full npm CLI.
exit /b 1
