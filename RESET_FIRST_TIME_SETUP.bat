@echo off
cd /d "%~dp0"
echo This removes the installed parts so setup runs again next time.
echo Your shop data is NOT deleted.
pause
rmdir /s /q ".venv" 2>nul
echo Done. Now double-click START_SMART_SHOP.bat
pause
