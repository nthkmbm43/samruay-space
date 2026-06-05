<div align="center">
  <img src="https://img.icons8.com/color/96/000000/apartment.png" alt="Logo" width="80" height="80">
  <h1 align="center">SAMRUAY SPACE 🏢</h1>
  <p align="center">
    ระบบบริหารจัดการหอพักและอพาร์ตเมนต์อัจฉริยะ (Smart Apartment Management System) <br />
    พร้อมเชื่อมต่อ LINE Chatbot เต็มรูปแบบเพื่ออำนวยความสะดวกให้กับทั้งผู้ให้เช่าและผู้เช่า
  </p>
</div>

---

## ✨ แนะนำระบบ (Introduction)

**SAMRUAY SPACE (สำรวยสเปซ)** คือระบบที่ถูกออกแบบมาเพื่อแก้ปัญหาความวุ่นวายในการบริหารจัดการหอพัก โดยเปลี่ยนการจดกระดาษ การตามทวงค่าเช่า และการตอบแชทที่ซ้ำซาก ให้กลายเป็นระบบอัตโนมัติ (Automated System) 

จุดเด่นของระบบนี้คือ **LINE-First Approach** ผู้เช่าไม่ต้องโหลดแอปพลิเคชันใดๆ สามารถทำทุกอย่างได้ผ่าน LINE Official Account ไม่ว่าจะเป็นการเช็คห้องว่าง, สมัครเข้าพัก, ดูบิลค่าเช่า, แจ้งซ่อม หรือส่งสลิปโอนเงิน ในขณะที่เจ้าของหอพักสามารถบริหารจัดการทุกอย่างได้ผ่าน **Admin Dashboard** บนเว็บไซต์ที่สวยงามและใช้งานง่าย

---

## 🚀 ฟีเจอร์หลัก (Key Features)

### 🤖 สำหรับผู้เช่า (LINE Chatbot Features)
- **ระบบค้นหาและจองห้องพักอัจฉริยะ:** พิมพ์คำว่า "ว่าง" หรือ "จองห้อง" บอทจะแสดงห้องว่างพร้อมราคา และนำทางเข้าสู่การลงทะเบียนอัตโนมัติ
- **ระบบสมัครง่ายๆ แบบ Step-by-Step:** เก็บข้อมูล ชื่อ-นามสกุล, เบอร์โทร และห้องที่จองผ่านการตอบแชท
- **ส่งสลิปชำระเงินผ่านแชท:** ผู้เช่าสามารถอัปโหลดรูปสลิปผ่าน LINE ได้เลย ระบบจะบันทึกรูปและดึงไปให้แอดมินตรวจบนเว็บ
- **ระบบแจ้งเตือนต่างๆ:** แจ้งบิลค่าเช่ารายเดือน, แจ้งสถานะชำระเงิน (อนุมัติ/ยอดไม่ครบ/ปฏิเสธ), ส่ง PDF ใบแจ้งหนี้
- **บริการอื่นๆ:** แจ้งซ่อม (พร้อมส่งภาพ/รายละเอียดให้ช่าง), รับข่าวสารโปรโมชั่น, และแจ้งย้ายออก

### 💻 สำหรับเจ้าของ/แอดมิน (Admin Dashboard)
- **ภาพรวม (Overview):** ดูรายได้รายเดือน, อัตราห้องว่าง, บิลค้างชำระ และกราฟสรุปแบบ Real-time
- **ระบบบริหารห้องพัก (Room Management):** จัดการตึก, ประเภทห้อง, สถานะ (ว่าง/จองแล้ว/มีคนอยู่)
- **ระบบจัดการคนเช่า (Tenant Management):** เก็บประวัติคนเช่า และผูกบัญชี LINE ให้อัตโนมัติ
- **ระบบบิลลิ่งและมิเตอร์ (Billing & Meter):** 
  - ระบบเดินจดมิเตอร์น้ำ/ไฟ ผ่านมือถือ
  - สร้างใบแจ้งหนี้อัตโนมัติ และส่งเข้า LINE ลูกบ้าน
  - **ระบบตรวจสอบสลิป:** เปิดดูรูปสลิปบนเว็บ กดอนุมัติ, แจ้งโอนไม่ครบ (ทวงเงินส่วนต่าง), หรือปฏิเสธ (ขอสลิปใหม่)
- **แจ้งซ่อม (Maintenance):** ระบบรับเรื่องแจ้งซ่อมจาก LINE และติดตามสถานะการซ่อมแซม
- **ระบบตัดสิทธิ์อัตโนมัติ (Cron Job):** หากจองห้องแล้วไม่โอนมัดจำภายใน 3 วัน ระบบจะปล่อยห้องให้ว่างอัตโนมัติ

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

### Frontend (ระบบหลังบ้านแอดมิน)
- **Framework:** [Next.js (App Router)](https://nextjs.org/) + React
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [Shadcn UI](https://ui.shadcn.com/) (Radix UI)
- **Icons & Graphics:** Lucide React, Recharts (สำหรับวาดกราฟ)

### Backend (ระบบ API และ Chatbot)
- **Framework:** Node.js + [Express.js](https://expressjs.com/)
- **Database ORM:** [Sequelize](https://sequelize.org/)
- **Database:** SQLite (รองรับการสลับไปใช้ PostgreSQL/MySQL สำหรับ Production)
- **LINE API:** `@line/bot-sdk` (เชื่อมต่อ Messaging API อย่างเป็นทางการ)
- **Document Generation:** `pdfkit` (สร้างบิล PDF อัตโนมัติ)
- **Task Scheduling:** `node-cron` (ตั้งเวลาเคลียร์ห้องจองหลุด)

---

## ⚙️ การติดตั้งและใช้งาน (Installation)

### ข้อกำหนดเบื้องต้น (Prerequisites)
1. ติดตั้ง Node.js (v18 ขึ้นไป)
2. มีบัญชี LINE Developer Account (เพื่อสร้าง Channel Access Token & Secret)

### ขั้นตอนการติดตั้ง

1. **Clone Project:**
   ```bash
   git clone https://github.com/nthkmbm43/samruay-space.git
   cd samruay-space
   ```

2. **ตั้งค่า Environment Variables:**
   คัดลอกไฟล์ `.env.example` เป็น `.env` ที่โฟลเดอร์ Root และใส่ค่าต่างๆ:
   ```env
   # ตัวอย่าง .env
   PORT=3001
   DB_DIALECT=sqlite
   DB_STORAGE=./backend/database.sqlite
   
   # LINE Bot API
   LINE_CHANNEL_ACCESS_TOKEN=your_line_token_here
   LINE_CHANNEL_SECRET=your_line_secret_here
   
   # JWT Secret สำหรับ Login
   JWT_SECRET=your_super_secret_key
   
   # URL ของระบบ
   APP_URL=https://your-backend-url.com
   NEXT_PUBLIC_API_URL=https://your-backend-url.com/api
   ```

3. **ติดตั้ง Backend & รัน API:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   *หมายเหตุ: เมื่อรันครั้งแรกลองระบบจะทำการ Auto-migrate ฐานข้อมูล และสร้างรหัสผ่านแอดมินตั้งต้นให้ (ลองดูใน Console)*

4. **ติดตั้ง Frontend & รัน Dashboard:**
   เปิด Terminal ใหม่
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   เข้าใช้งาน Admin Dashboard ที่: `http://localhost:3000`

---

## 🌐 การตั้งค่า LINE Webhook

เพื่อให้ LINE บอทสามารถคุยกับ Backend ของเราได้ คุณจะต้องตั้งค่า Webhook URL ใน LINE Developers Console:
- **Webhook URL:** `https://your-backend-url.com/webhooks/line`
- **Use webhook:** เปิด (Turn on)
- (หากรันในเครื่องตัวเอง (Local) ให้ใช้เครื่องมือเช่น `ngrok` เพื่อ forward port 3001 ออกสู่ Public ก่อน)

---

## 🔒 ความปลอดภัย (Security Notes)

- **ไฟล์ `.env` ถูกตั้งค่า Ignore ไว้:** จะไม่มีการนำรหัสผ่านหรือ Token ที่เป็นความลับขึ้นสู่ GitHub (ป้องกันการถูกแฮ็ก)
- **ระบบ Login:** Dashboard ถูกป้องกันด้วย JWT Authentication
- **Role-based Access:** แยกระดับสิทธิ์ Super Admin และ Admin

---

> **พัฒนาด้วย ❤️ สำหรับ หอพักแม่สำรวย (SAMRUAY SPACE)**
