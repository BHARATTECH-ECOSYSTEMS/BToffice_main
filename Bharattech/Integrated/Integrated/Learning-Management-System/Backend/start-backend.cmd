@echo off
set "NODE_EXE=C:\nvm4w\nodejs\node.exe"

if not exist "%NODE_EXE%" (
  echo Node was not found at %NODE_EXE%.
  echo Add Node.js to PATH or update NODE_EXE in this file.
  exit /b 1
)

"%NODE_EXE%" server.js
