@echo off
title Astol - Cloudflare Live Sharing
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -File "%~dp0share-tunnel.ps1"
pause

