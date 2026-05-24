@echo off
title ROOMS888 - Local Server Launcher
echo ==========================================================
echo           ROOMS888 Booking System Launcher
echo ==========================================================
echo.

cd /d "%~dp0"

REM Check .env file
if exist .env goto env_exists
echo [INFO] .env file not found, creating new configuration...
copy .env.example .env > nul
echo [SUCCESS] Created .env file successfully using SQLite!
echo [INFO] Default admin password: admin123
echo [INFO] You can change this password in the .env file anytime.
echo.
:env_exists

REM Check node_modules
if exist node_modules goto modules_exist
echo [INFO] node_modules not found, installing dependencies...
echo [INFO] This might take a minute or two on first run...
call npm install
if %errorlevel% neq 0 goto install_failed
:modules_exist

REM Generate Prisma Client
echo [INFO] Generating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 goto generate_failed

REM Sync database schema
echo [INFO] Syncing database schema...
call npx prisma db push --accept-data-loss
if %errorlevel% neq 0 goto push_failed

REM Seed database
echo [INFO] Checking and seeding default database values...
call npx prisma db seed
if %errorlevel% neq 0 (
    echo [WARNING] Seeding failed, but application might still work.
)

REM Start Next.js server
echo [INFO] Starting ROOMS888 server...
start "ROOMS888 Server Process" /min cmd /c "npm run dev"

echo [INFO] Waiting for server to start...
timeout /t 5 /nobreak > nul

echo [INFO] Opening ROOMS888 in web browser...
start http://localhost:3000

echo.
echo ==========================================================
echo   ROOMS888 is running at http://localhost:3000
echo   - Local database is stored at prisma/dev.db
echo   - You can close this console window to exit.
echo ==========================================================
echo.
pause
exit /b

:install_failed
echo [ERROR] npm install failed!
pause
exit /b

:generate_failed
echo [ERROR] Prisma client generation failed!
pause
exit /b

:push_failed
echo [ERROR] Database sync failed!
pause
exit /b
