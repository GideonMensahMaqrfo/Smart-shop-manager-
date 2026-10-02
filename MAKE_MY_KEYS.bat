@echo off
title Make my secret keys
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" goto nosetup
".venv\Scripts\python.exe" app.py genkeys > MY_KEYS.txt 2>nul
cls
echo.
echo   =============================================================
echo    YOUR SECRET KEYS - saved in the file MY_KEYS.txt
echo   =============================================================
echo.
type MY_KEYS.txt
echo.
echo   Copy VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY into Render.
echo   Keep MY_KEYS.txt private. Do NOT upload it to GitHub.
echo.
start "" notepad MY_KEYS.txt
pause
exit /b 0
:nosetup
echo.
echo   First double-click START_SMART_SHOP.bat once (it installs Python).
echo   Then close it and double-click this file again.
echo.
pause
