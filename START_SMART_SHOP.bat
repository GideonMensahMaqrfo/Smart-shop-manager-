@echo off
setlocal EnableExtensions
title Smart Shop Manager Online
cd /d "%~dp0"
set "HERE=%~dp0"
color 1F
cls
echo.
echo   =============================================================
echo            SMART SHOP MANAGER ONLINE  -  starting...
echo   =============================================================
echo.
if not exist "%HERE%app.py" goto notextracted

rem ---- Already set up before?  Then start straight away.
if exist "%HERE%.venv\installed.ok" goto run

echo   FIRST TIME SETUP. This happens only once - about 3 to 5 minutes.
echo   Please keep the internet ON and do not close this window.
echo.
echo   [1/3] Checking for Python...
call :findpython
if not defined PY call :installpython
if not defined PY call :findpython
if not defined PY goto nopython
echo         Found: %PY%
echo.
echo   [2/3] Preparing the program...
"%PY%" -m venv "%HERE%.venv" > "%HERE%setup_log.txt" 2>&1
if not exist "%HERE%.venv\Scripts\python.exe" goto failsetup
echo.
echo   [3/3] Downloading the parts it needs. Please wait...
"%HERE%.venv\Scripts\python.exe" -m pip install --upgrade pip >> "%HERE%setup_log.txt" 2>&1
"%HERE%.venv\Scripts\python.exe" -m pip install -r "%HERE%requirements.txt" >> "%HERE%setup_log.txt" 2>&1
if errorlevel 1 goto failpip
echo ok> "%HERE%.venv\installed.ok"
call :shortcut
echo.
echo   Setup finished. A "Smart Shop Online" icon is now on your Desktop.
timeout /t 3 /nobreak >nul

:run
set "SUPERADMIN_EMAIL=admin@test.com"
set "SUPERADMIN_PASSWORD=admin123"
set "IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do if not defined IP set "IP=%%a"
if defined IP set "IP=%IP: =%"
cls
echo.
echo   =============================================================
echo            SMART SHOP MANAGER ONLINE  is  RUNNING
echo   =============================================================
echo.
echo    Your browser will open by itself in a few seconds.
echo    If it does not, open Chrome and type:   localhost:5000
echo.
echo    On a phone on the SAME Wi-Fi, open:     %IP%:5000
echo    (If Windows asks about the firewall, click "Allow access".)
echo.
echo    Platform owner login:  admin@test.com   password: admin123
echo    To try a shop: click "Start free" on the website.
echo.
echo    KEEP THIS BLUE WINDOW OPEN while you use the shop.
echo    To STOP the program: close this window.
echo   =============================================================
echo.
start "" cmd /c "timeout /t 5 /nobreak >nul & start http://localhost:5000"
"%HERE%.venv\Scripts\python.exe" "%HERE%app.py"
echo.
echo   The program stopped. If you did not close it yourself,
echo   it may already be running in another window - check your browser.
pause
exit /b 0

:failsetup
color 4F
echo.
echo   Could not prepare the program. Details are in setup_log.txt
echo   Try: right-click this file and choose "Run as administrator".
pause
exit /b 1

:failpip
color 4F
echo.
echo   Could not download the parts it needs.
echo   Check that the internet is working, then double-click this file again.
echo   Details are in setup_log.txt
pause
exit /b 1

:shortcut
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Smart Shop Online.lnk'); $s.TargetPath=$env:HERE+'START_SMART_SHOP.bat'; $s.WorkingDirectory=$env:HERE; $s.IconLocation=$env:HERE+'static\icons\app.ico'; $s.Save()" >nul 2>&1
exit /b 0

rem ==================================================================
rem  Helpers: find Python, or install it automatically
rem ==================================================================
:findpython
set "PY="
for %%P in ("%LOCALAPPDATA%\Programs\Python\Python313\python.exe" "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" "%ProgramFiles%\Python313\python.exe" "%ProgramFiles%\Python312\python.exe" "%ProgramFiles%\Python311\python.exe" "%ProgramFiles%\Python310\python.exe") do if not defined PY if exist "%%~P" set "PY=%%~P"
if not defined PY for /f "delims=" %%i in ('py -3 -c "import sys;print(sys.executable)" 2^>nul') do set "PY=%%i"
if not defined PY for /f "delims=" %%i in ('python -c "import sys;print(sys.executable)" 2^>nul') do set "PY=%%i"
if not defined PY exit /b 0
"%PY%" -c "import sys;sys.exit(0 if sys.version_info>=(3,10) else 1)" >nul 2>&1
if errorlevel 1 set "PY="
exit /b 0

:installpython
echo.
echo   Python is not on this computer yet.
echo   Installing it now. This needs internet and takes about 2 minutes.
echo.
winget --version >nul 2>&1
if errorlevel 1 goto dlpython
winget install -e --id Python.Python.3.12 --scope user --silent --accept-package-agreements --accept-source-agreements
call :findpython
if defined PY exit /b 0
:dlpython
echo   Downloading Python from python.org ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -Uri 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe' -OutFile ($env:TEMP + '\python-setup.exe')"
if not exist "%TEMP%\python-setup.exe" exit /b 1
echo   Installing Python. If Windows asks for permission, click YES.
"%TEMP%\python-setup.exe" /quiet InstallAllUsers=0 PrependPath=1 Include_launcher=1 Include_tcltk=1 Include_test=0
exit /b 0

:notextracted
color 4F
echo.
echo   =============================================================
echo    STOP: you opened this file INSIDE the ZIP folder.
echo.
echo    1. Close this window.
echo    2. Right-click the ZIP file and choose  "Extract All..."
echo    3. Click "Extract".
echo    4. Open the NEW folder and double-click this file again.
echo   =============================================================
echo.
pause
exit /b 1

:nopython
color 4F
echo.
echo   =============================================================
echo    Python could not be installed automatically.
echo.
echo    Please do it by hand, it is easy:
echo    1. Open  https://www.python.org/downloads/
echo    2. Click the yellow "Download Python" button and open the file.
echo    3. IMPORTANT: tick the box "Add python.exe to PATH".
echo    4. Click "Install Now", wait, then close it.
echo    5. Double-click this file again.
echo   =============================================================
echo.
start "" https://www.python.org/downloads/
pause
exit /b 1
