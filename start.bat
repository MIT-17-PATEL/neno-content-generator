@echo off
setlocal enabledelayedexpansion

:: Set window title
title Neno AI Content Studio Launcher

:: Always change directory to the folder where this batch file is located
cd /d "%~dp0"

echo ================================================================
echo        NENO AI CONTENT STUDIO - AUTONOMOUS WORKSPACE            
echo ================================================================
echo.
echo Current Directory: %CD%
echo.

:: 1. Verify Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in your system PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Verify npm is installed
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not found in your system PATH.
    echo.
    pause
    exit /b 1
)

:: 3. Check for node_modules, install if missing
if not exist "node_modules\" (
    echo [SETUP] First-time setup: node_modules folder missing.
    echo Installing dependencies via npm install...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] npm install encountered an error.
        pause
        exit /b 1
    )
    echo [SETUP] Dependencies installed successfully!
    echo.
)

:: 4. Check for .env.local file
if not exist ".env.local" (
    if exist ".env.example" (
        echo [NOTICE] .env.local not found. Creating from .env.example...
        copy /y ".env.example" ".env.local" >nul
        echo [NOTICE] Created .env.local
    )
)

echo [LAUNCH] Starting local Next.js development server...
echo [INFO] Server URL: http://localhost:3000
echo [INFO] Press Ctrl + C anytime in this window to stop the server.
echo.

:: Automatically open browser after 3 seconds in the background
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

:: Start the Next.js dev server
call npm run dev

:: Keep window open if the process stops or fails
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Development server exited with code %ERRORLEVEL%.
)

echo.
echo Press any key to exit...
pause >nul
