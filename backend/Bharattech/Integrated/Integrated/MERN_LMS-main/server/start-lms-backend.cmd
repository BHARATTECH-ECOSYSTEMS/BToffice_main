@echo off
cd /d "%~dp0"
echo Starting LMS backend on port 65535...
"C:\xampp\nodejs\node.exe" server.js
