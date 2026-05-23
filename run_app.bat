@echo off
chcp 65001 > nul
title ROOMS888 - ตัวเปิดระบบจองห้องประชุม
echo ==========================================================
echo           ROOMS888 Booking System Launcher
echo ==========================================================
echo.

cd /d "%~dp0"

:: 1. ตรวจสอบไฟล์ .env
if not exist .env (
    echo [WARNING] ไม่พบไฟล์ .env
    echo กำลังสร้างไฟล์ .env จากไฟล์ตัวอย่าง (.env.example)...
    copy .env.example .env > nul
    echo.
    echo ----------------------------------------------------------
    echo [คำแนะนำ] ระบบจะเปิดไฟล์ .env ด้วย Notepad
    echo กรุณาใส่ "DATABASE_URL" และ "ADMIN_PASSWORD" ของคุณลงในไฟล์นั้น
    echo เมื่อแก้ไขและบันทึก (Save) ไฟล์แล้ว ให้กลับมากดปุ่มใดๆ ในหน้าต่างนี้เพื่อทำงานต่อ
    echo ----------------------------------------------------------
    echo.
    timeout /t 2 > nul
    start notepad.exe .env
    pause
)

:: 2. ตรวจสอบว่ามี DATABASE_URL ใน .env หรือยัง
findstr /C:"username:password" .env > nul
if %errorlevel% equ 0 (
    echo [WARNING] คุณยังไม่ได้เปลี่ยน DATABASE_URL ในไฟล์ .env!
    echo กรุณาแก้ไขไฟล์ .env ก่อน
    start notepad.exe .env
    pause
    exit /b
)

:: 3. ติดตั้ง Dependencies หากยังไม่มี
if not exist node_modules (
    echo [INFO] ไม่พบโฟลเดอร์ node_modules กำลังติดตั้ง dependencies...
    echo (ขั้นตอนนี้อาจใช้เวลา 1-2 นาทีในการรันครั้งแรก)
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] ติดตั้ง dependencies ล้มเหลว!
        pause
        exit /b
    )
)

:: 4. สร้าง Prisma Client
echo [INFO] กำลังสร้าง Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] สร้าง Prisma Client ล้มเหลว!
    pause
    exit /b
)

:: 5. เชื่อมต่อและปรับปรุงโครงสร้างฐานข้อมูล (Database Push)
echo [INFO] กำลังซิงค์โครงสร้างฐานข้อมูลไปที่ Supabase/PostgreSQL...
call npx prisma db push --accept-data-loss
if %errorlevel% neq 0 (
    echo [ERROR] ไม่สามารถเชื่อมต่อฐานข้อมูลได้!
    echo กรุณาตรวจสอบ DATABASE_URL ในไฟล์ .env ว่าถูกต้องและอินเทอร์เน็ตใช้งานได้
    pause
    exit /b
)

:: 6. ใส่ข้อมูลห้องประชุมเริ่มต้น (Database Seed)
echo [INFO] กำลังตรวจสอบและใส่ข้อมูลเริ่มต้น (Seed)...
call npx prisma db seed
if %errorlevel% neq 0 (
    echo [WARNING] ไม่สามารถใส่ข้อมูลห้องเริ่มต้นได้ แต่ระบบอาจใช้งานได้ตามปกติ
)

:: 7. เริ่มต้นเซิร์ฟเวอร์ Next.js และเปิดเบราว์เซอร์
echo [INFO] กำลังเริ่มต้นเซิร์ฟเวอร์ ROOMS888...
start "ROOMS888 Server Process" /min cmd /c "npm run dev"

echo [INFO] รอเซิร์ฟเวอร์พร้อมใช้งาน (5 วินาที)...
timeout /t 5 /nobreak > nul

echo [INFO] กำลังเปิดหน้าเว็บระบบจองห้องประชุม...
start http://localhost:3000

echo.
echo ==========================================================
echo   ระบบ ROOMS888 ทำงานแล้วที่ http://localhost:3000
echo   - หากคุณต้องการปิดระบบ ให้ปิดหน้าต่างคอนโซลนี้ได้เลย
echo ==========================================================
echo.
pause
