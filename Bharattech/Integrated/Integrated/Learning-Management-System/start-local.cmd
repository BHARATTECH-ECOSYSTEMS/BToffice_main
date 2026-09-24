@echo off
setlocal
set "ROOT=%~dp0"

start "LMS Backend" /D "%ROOT%Backend" cmd /k npm start
start "LMS Frontend" /D "%ROOT%frontend" cmd /k npm run dev
start "OpenInterviewer" /D "%ROOT%..\..\..\openinterviewer" cmd /k npm run dev

echo Backend:  http://localhost:5000
echo Learning-Management-System frontend: http://localhost:5174
echo OpenInterviewer: http://localhost:3000
echo FileSync (File Transfer): http://localhost:8080 (docker compose up -d in FileSync/deploy)
echo Invoice Builder (Finance & Billing): http://localhost:3001 (cd invoice-builder && docker compose up -d)
echo Chatwoot (Customer Support & Chat): http://localhost:3000 (cd ..\chatwoot && docker compose up -d)
echo Server (Screego Screen Share): http://localhost:5050 (start-server.cmd or cd ..\server && docker compose up -d)
echo Excalidraw (Virtual Whiteboard): http://localhost:5001 (cd ..\excalidraw && docker compose up -d)
echo LobeHub (AI Workspace & Agents): http://localhost:3210 (cd ..\lobehub && docker compose up -d)


