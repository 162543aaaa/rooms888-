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
    echo [INFO] ไม่พบไฟล์ .env กำลังสร้างไฟล์ค่ากำหนดใหม่...
    copy .env.example .env > nul
    echo [SUCCESS] สร้างไฟล์ .env สำเร็จ! (ระบบทำงานโดยใช้ SQLite ภายในเครื่อง)
    echo [INFO] รหัสผ่านควบคุมหน้าแอดมินเริ่มต้นคือ: your_secure_admin_password
    echo (คุณสามารถแก้ไขรหัสผ่านได้ในไฟล์ .env)
    echo.
)

:: 2. ติดตั้ง Dependencies หากยังไม่มี
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

:: 3. สร้าง Prisma Client
echo [INFO] กำลังสร้าง Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] สร้าง Prisma Client ล้มเหลว!
    pause
    exit /b
)

:: 4. เชื่อมต่อและปรับปรุงโครงสร้างฐานข้อมูล SQLite
echo [INFO] กำลังซิงค์โครงสร้างฐานข้อมูลในเครื่อง (SQLite)...
call npx prisma db push --accept-data-loss
if %errorlevel% neq 0 (
    echo [ERROR] ไม่สามารถสร้างฐานข้อมูลในเครื่องได้!
    pause
    exit /b
)

:: 5. ใส่ข้อมูลห้องประชุมเริ่มต้น (Database Seed)
echo [INFO] กำลังตรวจสอบและใส่ข้อมูลห้องตั้งต้น (Seed)...
call npx prisma db seed
if %errorlevel% neq 0 (
    echo [WARNING] ไม่สามารถใส่ข้อมูลห้องเริ่มต้นได้ แต่ระบบอาจใช้งานได้ตามปกติ
)

:: 6. เริ่มต้นเซิร์ฟเวอร์ Next.js และเปิดเบราว์เซอร์
echo [INFO] กำลังเริ่มต้นเซิร์ฟเวอร์ ROOMS888...
start "ROOMS888 Server Process" /min cmd /c "npm run dev"

echo [INFO] รอเซิร์ฟเวอร์พร้อมใช้งาน (5 วินาที)...
timeout /t 5 /nobreak > nul

echo [INFO] กำลังเปิดหน้าเว็บระบบจองห้องประชุม...
start http://localhost:3000

echo.
echo ==========================================================
echo   ระบบ ROOMS888 ทำงานแล้วที่ http://localhost:3000
echo   - ฐานข้อมูลถูกบันทึกไว้ในเครื่องเรียบร้อย (prisma/dev.db)
echo   - หากคุณต้องการปิดระบบ ให้ปิดหน้าต่างคอนโซลนี้ได้เลย
echo ==========================================================
echo.
pause
