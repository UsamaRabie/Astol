@echo off
chcp 65001 >nul
title Astol Fleet Management - نظام أسطول لإدارة المركبات
cls
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo حدث خطأ أثناء تشغيل النظام.
    pause
)
