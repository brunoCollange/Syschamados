@echo off
net session >nul 2>&1
if %errorLevel% == 0 (
    cd C:\ti-desk
    echo Iniciando TI Desk...
    start "TI-Desk-Server" cmd /k "npm start"
    timeout /t 2 /nobreak >nul
    start https://localhost:3000/
) else (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit
)