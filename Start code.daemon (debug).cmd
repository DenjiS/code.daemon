@echo off
rem Runs code.daemon with a console and DevTools so you can see errors.
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0CodeDaemon.ps1" -DevTools
pause
