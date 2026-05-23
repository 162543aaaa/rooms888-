# คู่มือการติดตั้งระบบ ROOMS888 บนระบบคลาวด์สาธารณะ (Cloud Deployment)

คู่มือนี้อธิบายวิธีการนำแอปพลิเคชัน ROOMS888 ขึ้นระบบคลาวด์ เพื่อให้ทุกคนในองค์กรหรือสาธารณะสามารถใช้งานได้ตลอด 24 ชั่วโมง

---

## ทางเลือกที่ 1: ติดตั้งบน Railway (แนะนำสำหรับ Next.js + SQLite)

**Railway.app** เป็นแพลตฟอร์มคลาวด์ที่ใช้งานง่าย รองรับการสร้าง Volume เก็บฐานข้อมูล SQLite แบบถาวร (Persistent Volume) ทำให้ข้อมูลไม่หายเมื่อเซิร์ฟเวอร์รีสตาร์ท

### ขั้นตอนการทำ:
1. สมัครใช้งานเว็บไซต์ [Railway](https://railway.app)
2. เชื่อมต่อบัญชี GitHub ของคุณ
3. สร้าง Project ใหม่และเลือก **Deploy from GitHub repo**
4. เชื่อม Repository ของโครงการนี้
5. ไปที่การตั้งค่าบริการ (Service Settings) ของโครงการ บน Railway:
   - เพิ่ม **Volume** ขนาด 1GB ขึ้นไป และตั้งค่า Mount Path ไปที่ `/app/prisma`
   - ตั้งค่า Environment Variables (Variables Tab):
     - `DATABASE_URL` = `file:/app/prisma/dev.db`
     - `ADMIN_PASSWORD` = `[ตั้งรหัสผ่านแอดมินของคุณ]`
     - `PORT` = `3000`
6. ใน `package.json` ส่วนของ `scripts` ให้ปรับ `build` ดังนี้ เพื่อให้ระบบ Sync ฐานข้อมูลอัตโนมัติตอน Build:
   `"build": "prisma db push && next build"`
7. Railway จะติดตั้งและรันเว็บแอปพร้อมให้ URL สาธารณะ (เช่น `https://rooms888.up.railway.app`)

---

## ทางเลือกที่ 2: ติดตั้งบน Render.com (สำหรับ Next.js + SQLite)

**Render.com** เป็นคลาวด์โฮสติ้งฟรี/ราคาประหยัดที่รองรับ Persistent Disk เช่นกัน

### ขั้นตอนการทำ:
1. สมัครใช้งาน [Render](https://render.com)
2. สร้าง **Web Service** ใหม่
3. เชื่อมต่อ GitHub Repository
4. ตั้งค่า Build Command และ Start Command:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`
5. ไปที่ส่วน **Advanced**:
   - เพิ่ม **Disk** ขนาด 1GB (Mount Path: `/opt/render/project/src/prisma`)
   - ตั้งค่า Environment Variables:
     - `DATABASE_URL` = `file:/opt/render/project/src/prisma/dev.db`
     - `ADMIN_PASSWORD` = `[ตั้งรหัสผ่านแอดมินของคุณ]`
6. กด Deploy และระบบจะเปิดหน้าเว็บสาธารณะให้อัตโนมัติ

---

## ทางเลือกที่ 3: ติดตั้งบน Vercel + Supabase (แนะนำสำหรับสเกลใหญ่)

**Vercel** เป็นแพลตฟอร์มที่เป็นเจ้าของ Next.js ซึ่งรันได้เร็วที่สุด แต่ไม่มีดิสก์เขียนข้อมูลในตัวเอง (Serverless) ดังนั้นจึงต้องเปลี่ยนฐานข้อมูลจาก SQLite ไปใช้ PostgreSQL ที่โฮสต์แยก เช่น **Supabase** หรือ **Neon**

### ขั้นตอนการทำ:
1. สมัครใช้งาน [Supabase](https://supabase.com) และสร้างฐานข้อมูล PostgreSQL ฟรี
2. คัดลอก **Connection String** (เช่น `postgresql://postgres:...`)
3. ปรับแก้ไฟล์ `prisma/schema.prisma` ในเครื่องเพื่อเปลี่ยน Provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. รัน `npx prisma db push` เพื่อย้ายตารางไปรันที่ Supabase
5. สมัครใช้งาน [Vercel](https://vercel.com) และสร้าง Project ใหม่เชื่อมกับ GitHub ของคุณ
6. ในหน้าตั้งค่าของ Vercel ให้ใส่ Environment Variables:
   - `DATABASE_URL` = `[ใส่ URL PostgreSQL ที่คัดลอกมา]`
   - `ADMIN_PASSWORD` = `[ตั้งรหัสผ่านแอดมินของคุณ]`
7. กด Deploy แอปพลิเคชันจะรันอยู่บน Vercel พร้อมเข้าถึงผ่าน Domain ฟรี เช่น `https://rooms888.vercel.app`
