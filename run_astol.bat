@echo off
title Astol Fleet Management
cls
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
if %ERRORLEVEL% NEQ 0 pause
