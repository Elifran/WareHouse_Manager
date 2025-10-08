@echo off
REM Setup ELIF Domains for Windows Devices
REM Run this batch file as Administrator on Windows devices

echo Setting up ELIF domains for this device...

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as Administrator - OK
) else (
    echo Please run as Administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Check if domains already exist
findstr /C:"orders.elif" C:\Windows\System32\drivers\etc\hosts >nul 2>&1
if %errorLevel% == 0 (
    echo ELIF domains already configured in hosts file
    echo Current configuration:
    findstr "elif" C:\Windows\System32\drivers\etc\hosts
    pause
    exit /b 0
)

REM Add ELIF domains to hosts file
echo Adding ELIF domains to hosts file...
echo 10.10.1.1 orders.elif >> C:\Windows\System32\drivers\etc\hosts
echo 10.10.1.1 sales.elif >> C:\Windows\System32\drivers\etc\hosts
echo 10.10.1.1 admin.elif >> C:\Windows\System32\drivers\etc\hosts
echo 10.10.1.1 api.elif >> C:\Windows\System32\drivers\etc\hosts

REM Flush DNS cache
echo Flushing DNS cache...
ipconfig /flushdns

echo.
echo ELIF domains added successfully!
echo.
echo You can now access:
echo    Orders: http://orders.elif
echo    Sales:  http://sales.elif
echo    Admin:  http://admin.elif
echo    Backend: http://api.elif
echo.
echo Test with: ping orders.elif
pause
