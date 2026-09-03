@echo off
setlocal
set "ROOT=%~dp0"

start "LMS Backend" /D "%ROOT%Backend" cmd /k npm start
start "LMS Frontend" /D "%ROOT%frontend" cmd /k npm run dev
start "OpenInterviewer" /D "%ROOT%..\..\..\openinterviewer" cmd /k npm run dev

echo Backend:  http://localhost:5000
echo Learning-Management-System frontend: http://localhost:5174
echo OpenInterviewer: http://localhost:3000
