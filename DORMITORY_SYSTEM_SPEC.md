# 🏠 ระบบจัดการหอพัก (Dormitory Management System)
> **Version:** 1.0.0 | **Stack:** Node.js + Express + PostgreSQL + Next.js (PWA)  
> **License:** Proprietary — For commercial use & portfolio

---

## 📋 สารบัญ

1. [ภาพรวมระบบ (System Overview)](#1-ภาพรวมระบบ)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [โครงสร้างไฟล์ (Project Structure)](#3-โครงสร้างไฟล์)
4. [ฐานข้อมูล (Database Schema)](#4-ฐานข้อมูล)
5. [ระบบผู้ใช้และสิทธิ์ (Roles & Permissions)](#5-ระบบผู้ใช้และสิทธิ์)
6. [โมดูลหลัก (Core Modules)](#6-โมดูลหลัก)
7. [ระบบบิลและใบเสร็จ (Billing System)](#7-ระบบบิลและใบเสร็จ)
8. [การแจ้งเตือนไลน์ (LINE Notification)](#8-การแจ้งเตือนไลน์)
9. [API Endpoints](#9-api-endpoints)
10. [UI/UX Design System](#10-uiux-design-system)
11. [การตั้งค่าและติดตั้ง (Setup & Deploy)](#11-การตั้งค่าและติดตั้ง)
12. [การรองรับ Offline (PWA)](#12-การรองรับ-offline)
13. [แผนการพัฒนาต่อ (Roadmap)](#13-แผนการพัฒนาต่อ)

---

## 1. ภาพรวมระบบ

### วัตถุประสงค์
ระบบ Web Application (PWA) สำหรับจัดการหอพัก ครอบคลุมตั้งแต่การจองห้อง, คำนวณค่าน้ำ/ค่าไฟ/ค่าห้อง, ออกใบเสร็จ, แจ้งเตือนผ่านไลน์ และรองรับการใช้งานทั้งออนไลน์และออฟไลน์

### ผู้ใช้งาน (Actors)
| Role | สิทธิ์ |
|------|--------|
| **Super Admin** | จัดการทั้งระบบ, กำหนดราคา, จัดการผู้ใช้ทุกระดับ |
| **Admin (เจ้าของหอพัก)** | จัดการห้อง, ผู้เช่า, บิล, โปรโมชั่น |
| **Staff** | บันทึกมิเตอร์, ออกบิล, รับชำระ |
| **Tenant (ผู้เช่า)** | ดูบิล, แจ้งชำระ, แจ้งซ่อม, แจ้งเข้า/ออก |

---

## 2. Tech Stack & Architecture

### Backend
```
Node.js (v20 LTS)
├── Express.js        — REST API Framework
├── Sequelize ORM     — Database abstraction
├── PostgreSQL 16     — Primary Database
├── Redis             — Session cache + job queue
├── Bull Queue        — Background jobs (LINE notify, billing)
├── JWT               — Authentication
├── Multer            — File upload (QR Code, สลิป)
├── Sharp             — Image processing
├── PDFKit            — PDF invoice generation
├── node-cron         — Scheduled tasks (billing reminders)
└── Socket.io         — Real-time notifications
```

### Frontend
```
Next.js 14 (App Router)
├── TypeScript
├── Tailwind CSS      — Styling
├── shadcn/ui         — UI Components
├── React Hook Form   — Form management
├── Zustand           — State management
├── React Query       — Server state + caching
├── next-pwa          — PWA support (offline)
├── Chart.js          — Analytics dashboard
└── jsPDF + html2canvas — Client-side PDF
```

### Infrastructure
```
Docker + Docker Compose
├── PostgreSQL (database)
├── Redis (cache/queue)
├── Nginx (reverse proxy)
└── Node.js App
```

### LINE Integration
```
LINE Messaging API (Free Tier)
├── LINE OA (Official Account) — สำหรับหอพัก
├── LINE Login            — ผู้เช่า Login ผ่าน LINE
├── LINE Notify (ฟรี)     — Push notification
└── LINE LIFF             — Mini App ใน LINE
```

---

## 3. โครงสร้างไฟล์

```
dormitory-system/
├── 📁 backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js         — DB connection
│   │   │   ├── redis.js            — Redis config
│   │   │   ├── line.js             — LINE API config
│   │   │   └── app.js              — Express app setup
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Property.js         — หอพัก
│   │   │   ├── Floor.js            — ชั้น
│   │   │   ├── Room.js             — ห้องพัก
│   │   │   ├── RoomType.js         — ประเภทห้อง
│   │   │   ├── Tenant.js           — ผู้เช่า
│   │   │   ├── Contract.js         — สัญญาเช่า
│   │   │   ├── MeterReading.js     — บันทึกมิเตอร์
│   │   │   ├── Invoice.js          — ใบแจ้งหนี้
│   │   │   ├── InvoiceItem.js      — รายการในบิล
│   │   │   ├── Payment.js          — การชำระเงิน
│   │   │   ├── Promotion.js        — โปรโมชั่น
│   │   │   ├── MaintenanceRequest.js — แจ้งซ่อม
│   │   │   ├── Notification.js     — การแจ้งเตือน
│   │   │   └── Setting.js          — ตั้งค่าระบบ
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── property.controller.js
│   │   │   ├── room.controller.js
│   │   │   ├── tenant.controller.js
│   │   │   ├── meter.controller.js
│   │   │   ├── invoice.controller.js
│   │   │   ├── payment.controller.js
│   │   │   ├── promotion.controller.js
│   │   │   ├── maintenance.controller.js
│   │   │   └── report.controller.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── property.routes.js
│   │   │   ├── room.routes.js
│   │   │   ├── tenant.routes.js
│   │   │   ├── meter.routes.js
│   │   │   ├── invoice.routes.js
│   │   │   ├── payment.routes.js
│   │   │   ├── promotion.routes.js
│   │   │   ├── maintenance.routes.js
│   │   │   └── report.routes.js
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js   — JWT verification
│   │   │   ├── role.middleware.js   — Role-based access
│   │   │   ├── validate.middleware.js
│   │   │   └── upload.middleware.js
│   │   ├── services/
│   │   │   ├── billing.service.js  — คำนวณค่าใช้จ่าย
│   │   │   ├── invoice.service.js  — สร้างใบเสร็จ
│   │   │   ├── pdf.service.js      — Generate PDF
│   │   │   ├── line.service.js     — LINE notifications
│   │   │   ├── email.service.js    — Email notifications
│   │   │   └── qr.service.js       — QR Code payment
│   │   ├── jobs/
│   │   │   ├── billing.job.js      — Auto generate monthly bills
│   │   │   ├── reminder.job.js     — Payment reminders
│   │   │   └── overdue.job.js      — Mark overdue payments
│   │   └── utils/
│   │       ├── response.js
│   │       ├── pagination.js
│   │       └── dateHelper.js
│   ├── migrations/                 — DB migrations
│   ├── seeders/                    — Sample data
│   ├── uploads/                    — Uploaded files
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── 📁 frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── (admin)/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── properties/     — จัดการหอพัก
│   │   │   │   ├── rooms/          — จัดการห้อง
│   │   │   │   ├── tenants/        — จัดการผู้เช่า
│   │   │   │   ├── meters/         — บันทึกมิเตอร์
│   │   │   │   ├── invoices/       — ใบแจ้งหนี้
│   │   │   │   ├── payments/       — การชำระเงิน
│   │   │   │   ├── promotions/     — โปรโมชั่น
│   │   │   │   ├── maintenance/    — แจ้งซ่อม
│   │   │   │   ├── reports/        — รายงาน
│   │   │   │   └── settings/       — ตั้งค่า
│   │   │   ├── (tenant)/
│   │   │   │   ├── my-room/        — ข้อมูลห้องของฉัน
│   │   │   │   ├── bills/          — บิลของฉัน
│   │   │   │   ├── payment/        — ชำระเงิน
│   │   │   │   ├── maintenance/    — แจ้งซ่อม
│   │   │   │   └── contract/       — สัญญาของฉัน
│   │   │   └── api/                — Next.js API routes
│   │   ├── components/
│   │   │   ├── ui/                 — Base UI (shadcn)
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── MobileNav.tsx
│   │   │   │   └── Breadcrumb.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── StatsCard.tsx
│   │   │   │   ├── OccupancyChart.tsx
│   │   │   │   ├── RevenueChart.tsx
│   │   │   │   └── RecentActivity.tsx
│   │   │   ├── billing/
│   │   │   │   ├── InvoiceForm.tsx
│   │   │   │   ├── InvoicePreview.tsx
│   │   │   │   ├── BillCash.tsx        — บิลเงินสด
│   │   │   │   ├── BillInvoice.tsx     — Invoice
│   │   │   │   ├── BillReceipt.tsx     — ใบเสร็จ
│   │   │   │   └── BillQRTransfer.tsx  — QR โอนเงิน
│   │   │   ├── rooms/
│   │   │   │   ├── RoomCard.tsx
│   │   │   │   ├── RoomGrid.tsx
│   │   │   │   ├── RoomForm.tsx
│   │   │   │   └── RoomStatusBadge.tsx
│   │   │   └── shared/
│   │   │       ├── ConfirmDialog.tsx
│   │   │       ├── StatusBadge.tsx
│   │   │       ├── DataTable.tsx
│   │   │       ├── SearchInput.tsx
│   │   │       └── QRCodeDisplay.tsx
│   │   ├── lib/
│   │   │   ├── api.ts              — API client
│   │   │   ├── auth.ts             — Auth helpers
│   │   │   └── utils.ts
│   │   ├── store/
│   │   │   ├── authStore.ts
│   │   │   ├── uiStore.ts
│   │   │   └── notificationStore.ts
│   │   ├── hooks/
│   │   │   ├── useRooms.ts
│   │   │   ├── useInvoices.ts
│   │   │   └── usePayments.ts
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   │   ├── icons/                  — PWA icons
│   │   ├── manifest.json           — PWA manifest
│   │   └── sw.js                   — Service Worker
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── 📁 docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
└── README.md
```

---

## 4. ฐานข้อมูล

### Entity Relationship (สรุป)

```
Property (หอพัก)
  └── Floor (ชั้น) [1:N]
       └── Room (ห้อง) [1:N]
            ├── RoomType (ประเภทห้อง) [N:1]
            ├── Contract (สัญญา) [1:N]
            │    └── Tenant (ผู้เช่า) [N:1]
            └── MeterReading (มิเตอร์) [1:N]

Invoice (ใบแจ้งหนี้)
  ├── InvoiceItem (รายการ) [1:N]
  ├── Room [N:1]
  ├── Tenant [N:1]
  └── Payment (การชำระ) [1:N]

Promotion (โปรโมชั่น)
  └── ใช้กับ Room หรือ RoomType
```

### SQL Schema (PostgreSQL)

```sql
-- =============================
-- SETTINGS (ตั้งค่าระบบ)
-- =============================
CREATE TABLE settings (
  id            SERIAL PRIMARY KEY,
  key           VARCHAR(100) UNIQUE NOT NULL,
  value         TEXT,
  value_type    VARCHAR(20) DEFAULT 'string', -- string|number|boolean|json
  description   TEXT,
  is_public     BOOLEAN DEFAULT FALSE,
  updated_by    INTEGER,
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ค่าเริ่มต้น
INSERT INTO settings (key, value, value_type, description) VALUES
  ('room_price_default',    '1500',  'number', 'ค่าห้องเริ่มต้น (บาท/เดือน)'),
  ('water_rate_per_unit',   '20',    'number', 'ค่าน้ำ (บาท/หน่วย)'),
  ('electricity_rate',      '6',     'number', 'ค่าไฟ (บาท/หน่วย)'),
  ('payment_due_day',       '5',     'number', 'วันครบกำหนดชำระ (วันที่ของทุกเดือน)'),
  ('line_channel_token',    '',      'string', 'LINE Channel Access Token'),
  ('line_channel_secret',   '',      'string', 'LINE Channel Secret'),
  ('property_name',         'หอพัก', 'string', 'ชื่อหอพัก'),
  ('property_address',      '',      'string', 'ที่อยู่หอพัก'),
  ('property_phone',        '',      'string', 'เบอร์โทรหอพัก'),
  ('bank_account_name',     '',      'string', 'ชื่อบัญชีธนาคาร'),
  ('bank_account_number',   '',      'string', 'เลขบัญชีธนาคาร'),
  ('bank_name',             '',      'string', 'ธนาคาร'),
  ('promptpay_id',          '',      'string', 'เลข PromptPay (QR Code)'),
  ('tax_id',                '',      'string', 'เลขประจำตัวผู้เสียภาษี'),
  ('late_fee_per_day',      '0',     'number', 'ค่าปรับล่าช้า (บาท/วัน)'),
  ('deposit_months',        '2',     'number', 'เดือนเงินมัดจำ (เท่าของค่าห้อง)');

-- =============================
-- USERS (ผู้ใช้งาน)
-- =============================
CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  email           VARCHAR(255) UNIQUE,
  phone           VARCHAR(20),
  password_hash   VARCHAR(255),
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  role            VARCHAR(20) NOT NULL DEFAULT 'tenant',
                  -- super_admin | admin | staff | tenant
  avatar_url      TEXT,
  line_user_id    VARCHAR(100),           -- LINE UID
  line_display_name VARCHAR(100),
  is_active       BOOLEAN DEFAULT TRUE,
  last_login_at   TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- =============================
-- PROPERTIES (หอพัก)
-- =============================
CREATE TABLE properties (
  id              SERIAL PRIMARY KEY,
  owner_id        INTEGER REFERENCES users(id),
  name            VARCHAR(200) NOT NULL,
  address         TEXT,
  phone           VARCHAR(20),
  logo_url        TEXT,
  qr_code_url     TEXT,                   -- QR โอนเงิน
  tax_id          VARCHAR(20),
  bank_name       VARCHAR(100),
  bank_account    VARCHAR(30),
  promptpay_id    VARCHAR(20),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- =============================
-- FLOORS (ชั้น)
-- =============================
CREATE TABLE floors (
  id              SERIAL PRIMARY KEY,
  property_id     INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  floor_number    INTEGER NOT NULL,
  name            VARCHAR(100),           -- "ชั้น 1" หรือกำหนดเอง
  description     TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(property_id, floor_number)
);

-- =============================
-- ROOM TYPES (ประเภทห้อง)
-- =============================
CREATE TABLE room_types (
  id              SERIAL PRIMARY KEY,
  property_id     INTEGER REFERENCES properties(id),
  name            VARCHAR(100) NOT NULL,  -- "ห้องมาตรฐาน", "ห้อง VIP"
  description     TEXT,
  base_price      DECIMAL(10,2) NOT NULL DEFAULT 1500,
  area_sqm        DECIMAL(8,2),           -- ขนาดห้อง ตร.ม.
  amenities       JSONB DEFAULT '[]',     -- ["พัดลม","ตู้เย็น","แอร์"]
  created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================
-- ROOMS (ห้องพัก)
-- =============================
CREATE TABLE rooms (
  id              SERIAL PRIMARY KEY,
  property_id     INTEGER REFERENCES properties(id),
  floor_id        INTEGER REFERENCES floors(id),
  room_type_id    INTEGER REFERENCES room_types(id),
  room_number     VARCHAR(20) NOT NULL,   -- "101", "A201"
  name            VARCHAR(100),           -- ชื่อห้อง (ถ้ามี)
  price_override  DECIMAL(10,2),          -- ราคาพิเศษของห้องนี้ (ถ้า null ใช้ราคา room_type)
  status          VARCHAR(20) DEFAULT 'available',
                  -- available | occupied | maintenance | reserved
  water_meter_start DECIMAL(10,2) DEFAULT 0,  -- มิเตอร์น้ำเริ่มต้น
  elec_meter_start  DECIMAL(10,2) DEFAULT 0,  -- มิเตอร์ไฟเริ่มต้น
  description     TEXT,
  images          JSONB DEFAULT '[]',     -- รูปห้อง
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(property_id, room_number)
);

-- =============================
-- TENANTS (ผู้เช่า)
-- =============================
CREATE TABLE tenants (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id),
  id_card_number  VARCHAR(20),
  id_card_image   TEXT,
  emergency_contact_name  VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  vehicle_info    JSONB DEFAULT '[]',     -- ทะเบียนรถ
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- =============================
-- CONTRACTS (สัญญาเช่า)
-- =============================
CREATE TABLE contracts (
  id              SERIAL PRIMARY KEY,
  room_id         INTEGER REFERENCES rooms(id),
  tenant_id       INTEGER REFERENCES tenants(id),
  start_date      DATE NOT NULL,
  end_date        DATE,                   -- null = ไม่กำหนดสิ้นสุด
  monthly_price   DECIMAL(10,2) NOT NULL, -- ราคาที่ตกลง (snapshot ณ วันทำสัญญา)
  deposit_amount  DECIMAL(10,2) DEFAULT 0,
  deposit_paid    BOOLEAN DEFAULT FALSE,
  status          VARCHAR(20) DEFAULT 'active',
                  -- pending | active | terminated | expired
  move_in_date    DATE,
  move_out_date   DATE,
  move_out_reason TEXT,
  initial_water_meter DECIMAL(10,2) DEFAULT 0,
  initial_elec_meter  DECIMAL(10,2) DEFAULT 0,
  contract_file   TEXT,                   -- ไฟล์สัญญา
  notes           TEXT,
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- =============================
-- METER READINGS (บันทึกมิเตอร์)
-- =============================
CREATE TABLE meter_readings (
  id              SERIAL PRIMARY KEY,
  room_id         INTEGER REFERENCES rooms(id),
  reading_date    DATE NOT NULL,
  period_month    INTEGER NOT NULL,       -- เดือน (1-12)
  period_year     INTEGER NOT NULL,       -- ปี
  water_previous  DECIMAL(10,2),          -- หน่วยน้ำก่อนหน้า
  water_current   DECIMAL(10,2),          -- หน่วยน้ำปัจจุบัน
  water_units     DECIMAL(10,2),          -- จำนวนหน่วยน้ำที่ใช้
  elec_previous   DECIMAL(10,2),          -- หน่วยไฟก่อนหน้า
  elec_current    DECIMAL(10,2),          -- หน่วยไฟปัจจุบัน
  elec_units      DECIMAL(10,2),          -- จำนวนหน่วยไฟที่ใช้
  water_image     TEXT,                   -- รูปมิเตอร์น้ำ
  elec_image      TEXT,                   -- รูปมิเตอร์ไฟ
  recorded_by     INTEGER REFERENCES users(id),
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(room_id, period_month, period_year)
);

-- =============================
-- PROMOTIONS (โปรโมชั่น)
-- =============================
CREATE TABLE promotions (
  id              SERIAL PRIMARY KEY,
  property_id     INTEGER REFERENCES properties(id),
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  type            VARCHAR(30) NOT NULL,
                  -- percent_discount | fixed_discount | free_months
                  -- | reduced_rate | waive_water | waive_electricity
  value           DECIMAL(10,2),          -- ค่า discount หรือจำนวนเดือนฟรี
  applies_to      VARCHAR(30) DEFAULT 'room_price',
                  -- room_price | water | electricity | all
  target_type     VARCHAR(20) DEFAULT 'all',
                  -- all | specific_room | room_type | new_tenant
  target_ids      JSONB DEFAULT '[]',     -- room_id[] หรือ room_type_id[]
  start_date      DATE NOT NULL,
  end_date        DATE,
  min_months      INTEGER DEFAULT 1,      -- ต้องเช่าขั้นต่ำกี่เดือน
  max_uses        INTEGER,                -- จำกัดจำนวนการใช้ (null = ไม่จำกัด)
  used_count      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- =============================
-- INVOICES (ใบแจ้งหนี้)
-- =============================
CREATE TABLE invoices (
  id              SERIAL PRIMARY KEY,
  invoice_number  VARCHAR(30) UNIQUE NOT NULL,  -- INV-YYYYMM-XXXX
  property_id     INTEGER REFERENCES properties(id),
  room_id         INTEGER REFERENCES rooms(id),
  tenant_id       INTEGER REFERENCES tenants(id),
  contract_id     INTEGER REFERENCES contracts(id),
  period_month    INTEGER NOT NULL,
  period_year     INTEGER NOT NULL,
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE NOT NULL,          -- วันครบกำหนด (วันที่ 5 ของเดือนถัดไป)
  
  -- ค่าห้อง
  room_price      DECIMAL(10,2) DEFAULT 0,
  
  -- ค่าน้ำ
  water_previous  DECIMAL(10,2),
  water_current   DECIMAL(10,2),
  water_units     DECIMAL(10,2),
  water_rate      DECIMAL(10,2),          -- snapshot ราคา ณ เวลาออกบิล
  water_amount    DECIMAL(10,2) DEFAULT 0,
  
  -- ค่าไฟ
  elec_previous   DECIMAL(10,2),
  elec_current    DECIMAL(10,2),
  elec_units      DECIMAL(10,2),
  elec_rate       DECIMAL(10,2),
  elec_amount     DECIMAL(10,2) DEFAULT 0,
  
  -- รายการอื่นๆ
  other_charges   JSONB DEFAULT '[]',     -- [{name, amount}]
  
  -- ส่วนลด
  promotion_id    INTEGER REFERENCES promotions(id),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_note   TEXT,
  
  -- ยอดรวม
  subtotal        DECIMAL(10,2) DEFAULT 0,
  vat_percent     DECIMAL(5,2) DEFAULT 0,
  vat_amount      DECIMAL(10,2) DEFAULT 0,
  total           DECIMAL(10,2) NOT NULL,
  
  -- ค่าปรับ
  late_fee        DECIMAL(10,2) DEFAULT 0,
  
  -- สถานะ
  status          VARCHAR(20) DEFAULT 'pending',
                  -- pending | paid | partial | overdue | cancelled | void
  
  payment_method  VARCHAR(20),            -- cash | transfer | qr
  paid_at         TIMESTAMP,
  paid_amount     DECIMAL(10,2),
  
  notes           TEXT,
  generated_by    VARCHAR(10) DEFAULT 'auto',  -- auto | manual
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- =============================
-- PAYMENTS (การชำระเงิน)
-- =============================
CREATE TABLE payments (
  id              SERIAL PRIMARY KEY,
  invoice_id      INTEGER REFERENCES invoices(id),
  amount          DECIMAL(10,2) NOT NULL,
  method          VARCHAR(20) NOT NULL,   -- cash | transfer | qr
  payment_date    TIMESTAMP NOT NULL DEFAULT NOW(),
  reference_number VARCHAR(100),          -- เลขที่อ้างอิงการโอน
  slip_image      TEXT,                   -- รูปสลิป
  received_by     INTEGER REFERENCES users(id),
  notes           TEXT,
  status          VARCHAR(20) DEFAULT 'confirmed',
                  -- pending | confirmed | rejected
  created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================
-- MAINTENANCE REQUESTS (แจ้งซ่อม)
-- =============================
CREATE TABLE maintenance_requests (
  id              SERIAL PRIMARY KEY,
  property_id     INTEGER REFERENCES properties(id),
  room_id         INTEGER REFERENCES rooms(id),
  tenant_id       INTEGER REFERENCES tenants(id),
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  category        VARCHAR(50),            -- electrical | plumbing | furniture | other
  priority        VARCHAR(20) DEFAULT 'normal',  -- low | normal | high | urgent
  status          VARCHAR(20) DEFAULT 'pending',
                  -- pending | in_progress | completed | cancelled
  images          JSONB DEFAULT '[]',
  assigned_to     INTEGER REFERENCES users(id),
  completed_at    TIMESTAMP,
  tenant_rating   INTEGER,                -- 1-5 คะแนน
  tenant_feedback TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- =============================
-- NOTIFICATIONS (การแจ้งเตือน)
-- =============================
CREATE TABLE notifications (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id),
  type            VARCHAR(50) NOT NULL,
  title           VARCHAR(200),
  message         TEXT,
  data            JSONB,
  channel         VARCHAR(20) DEFAULT 'in_app', -- in_app | line | email | sms
  is_read         BOOLEAN DEFAULT FALSE,
  sent_at         TIMESTAMP,
  read_at         TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================
-- INDEXES
-- =============================
CREATE INDEX idx_rooms_property ON rooms(property_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_contracts_room ON contracts(room_id);
CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_meter_readings_room_period ON meter_readings(room_id, period_year, period_month);
CREATE INDEX idx_invoices_room ON invoices(room_id);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
```

---

## 5. ระบบผู้ใช้และสิทธิ์

### Role Matrix

| Feature | Super Admin | Admin | Staff | Tenant |
|---------|:-----------:|:-----:|:-----:|:------:|
| จัดการ Property | ✅ | ✅ | ❌ | ❌ |
| เพิ่ม/ลบ ชั้น/ห้อง | ✅ | ✅ | ❌ | ❌ |
| กำหนดราคาห้อง/น้ำ/ไฟ | ✅ | ✅ | ❌ | ❌ |
| จัดการโปรโมชั่น | ✅ | ✅ | ❌ | ❌ |
| เพิ่ม/แก้ไขผู้เช่า | ✅ | ✅ | ✅ | ❌ |
| บันทึกมิเตอร์ | ✅ | ✅ | ✅ | ❌ |
| ออกบิล/ใบเสร็จ | ✅ | ✅ | ✅ | ❌ |
| รับชำระเงิน | ✅ | ✅ | ✅ | ❌ |
| ดูบิลตัวเอง | ❌ | ❌ | ❌ | ✅ |
| แจ้งชำระเงิน | ❌ | ❌ | ❌ | ✅ |
| แจ้งซ่อม | ✅ | ✅ | ✅ | ✅ |
| แจ้งออก/ขอเช่า | ❌ | ❌ | ❌ | ✅ |
| ดูรายงาน | ✅ | ✅ | จำกัด | ❌ |
| ตั้งค่าระบบ | ✅ | ✅ | ❌ | ❌ |
| จัดการผู้ใช้ | ✅ | จำกัด | ❌ | ❌ |

---

## 6. โมดูลหลัก

### 6.1 จัดการห้องพัก (Room Management)

**คุณสมบัติ:**
- เพิ่ม/แก้ไข/ลบ หอพัก, ชั้น, ห้อง
- กำหนดประเภทห้อง (RoomType) พร้อมราคาและสิ่งอำนวยความสะดวก
- Override ราคาแต่ละห้องได้
- แสดงสถานะห้อง: ว่าง / มีคนอยู่ / ซ่อมบำรุง / จองแล้ว
- อัปโหลดรูปห้อง
- แผนผังห้องแบบ Grid view

**Logic:**
```javascript
// billing.service.js
async function calculateMonthlyBill(roomId, periodMonth, periodYear) {
  const room = await Room.findByPk(roomId, { include: [RoomType] });
  const contract = await Contract.findOne({
    where: { room_id: roomId, status: 'active' }
  });
  const meter = await MeterReading.findOne({
    where: { room_id: roomId, period_month: periodMonth, period_year: periodYear }
  });
  
  const settings = await getSettings(); // cache from Redis
  
  // ราคาห้อง: ใช้ override ถ้ามี, ไม่งั้นใช้ contract price
  const roomPrice = contract.monthly_price;
  
  // ค่าน้ำ
  const waterRate = parseFloat(settings.water_rate_per_unit || 20);
  const waterUnits = meter.water_units || 0;
  const waterAmount = waterUnits * waterRate;
  
  // ค่าไฟ
  const elecRate = parseFloat(settings.electricity_rate || 6);
  const elecUnits = meter.elec_units || 0;
  const elecAmount = elecUnits * elecRate;
  
  // ตรวจสอบโปรโมชั่น
  const discount = await applyPromotion(roomId, contract.tenant_id);
  
  const subtotal = roomPrice + waterAmount + elecAmount;
  const total = subtotal - discount.amount;
  
  return { roomPrice, waterUnits, waterAmount, elecUnits, elecAmount,
           discount, subtotal, total };
}
```

### 6.2 ระบบผู้เช่า (Tenant Management)

**ขั้นตอนการเช่าห้อง:**
1. ผู้เช่าส่งคำขอเช่า (online หรือ admin เพิ่มให้)
2. Admin ตรวจสอบและอนุมัติ
3. ทำสัญญา (ระบุวันเริ่ม, ราคา, เงินมัดจำ)
4. บันทึกมิเตอร์เริ่มต้น
5. เปลี่ยนสถานะห้องเป็น "มีคนอยู่"
6. แจ้งเตือนผ่านไลน์

**การแจ้งออก:**
1. ผู้เช่าแจ้งออกล่วงหน้า (กำหนดได้ เช่น 30 วัน)
2. Admin รับทราบและยืนยัน
3. ออกบิลงวดสุดท้าย (คำนวณตามวันจริง)
4. คืนเงินมัดจำ (หักค่าเสียหาย ถ้ามี)
5. ปิดสัญญา, เปลี่ยนสถานะห้องเป็น "ว่าง"

### 6.3 บันทึกมิเตอร์ (Meter Reading)

**Manual Mode:**
- Staff บันทึกหน่วยมิเตอร์น้ำ/ไฟ ทีละห้อง
- อัปโหลดรูปถ่ายมิเตอร์
- ระบบคำนวณหน่วยที่ใช้อัตโนมัติ (ปัจจุบัน - ก่อนหน้า)
- ตรวจสอบความผิดปกติ (ใช้เกินค่าเฉลี่ยมาก)

**Auto Mode (เผื่ออนาคต):**
- รองรับ IoT smart meter API integration
- Architecture แบ่งแยก service ไว้แล้ว

---

## 7. ระบบบิลและใบเสร็จ

### 7.1 ประเภทบิล

#### บิลเงินสด (Cash Bill)
```
┌─────────────────────────────────────┐
│  🏠 ชื่อหอพัก                        │
│  📍 ที่อยู่                          │
│─────────────────────────────────────│
│  ใบแจ้งค่าเช่า (เงินสด)             │
│  เลขที่: INV-202501-0001            │
│  ห้อง: 101  ชั้น 1                  │
│  ผู้เช่า: ชื่อผู้เช่า               │
│  งวด: มกราคม 2568                   │
│─────────────────────────────────────│
│  ค่าห้อง              1,500.00 ฿   │
│  ค่าน้ำ  10 หน่วย × 20   200.00 ฿  │
│  ค่าไฟ  50 หน่วย × 6    300.00 ฿   │
│─────────────────────────────────────│
│  รวมทั้งสิ้น          2,000.00 ฿   │
│  ครบกำหนด: 5 กุมภาพันธ์ 2568        │
└─────────────────────────────────────┘
```

#### Invoice (ใบแจ้งหนี้อย่างเป็นทางการ)
- มีเลขที่อ้างอิง
- รายละเอียดครบถ้วน
- ลายเซ็นดิจิทัล/ตราประทับ
- QR Code invoice reference
- Export เป็น PDF

#### ใบเสร็จรับเงิน (Official Receipt)
- ออกหลังชำระเงินแล้ว
- มีเลขที่ใบเสร็จ
- ระบุวิธีชำระ, วันที่ชำระ
- รองรับ e-Receipt
- มีลายเซ็นผู้รับเงิน

#### บิลโอนเงิน + QR Code
```
┌─────────────────────────────────────┐
│  ใบแจ้งชำระเงิน (โอนเงิน)          │
│  ─────────────────────────────────  │
│  ธนาคาร: กสิกรไทย                  │
│  ชื่อบัญชี: ...                     │
│  เลขบัญชี: XXX-X-XXXXX-X           │
│                                     │
│     [  QR Code สแกนจ่าย  ]         │
│     (แนบไฟล์ QR ของคุณเอง)         │
│                                     │
│  ยอดที่ต้องชำระ: 2,000 บาท         │
│  ─────────────────────────────────  │
│  📎 แนบสลิปหลังโอน                  │
└─────────────────────────────────────┘
```

### 7.2 การสร้างบิลอัตโนมัติ

```javascript
// jobs/billing.job.js
// ทำงานทุกวันที่ 1 ของเดือน เวลา 06:00 น.
cron.schedule('0 6 1 * *', async () => {
  const activeContracts = await Contract.findAll({
    where: { status: 'active' },
    include: [Room, Tenant]
  });
  
  const today = new Date();
  const dueDay = await getSetting('payment_due_day'); // default: 5
  const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
  
  for (const contract of activeContracts) {
    // ตรวจว่ายังไม่มีบิลเดือนนี้
    const existing = await Invoice.findOne({
      where: {
        contract_id: contract.id,
        period_month: today.getMonth() + 1,
        period_year: today.getFullYear()
      }
    });
    if (existing) continue;
    
    // ตรวจมิเตอร์ (ถ้าไม่มี จะสร้างบิลค่าห้องอย่างเดียวก่อน)
    const meter = await MeterReading.findOne({ ... });
    
    const bill = await calculateMonthlyBill(contract.room_id, ...);
    const invoice = await Invoice.create({ ...bill, due_date: dueDate });
    
    // แจ้งเตือนไลน์
    await lineService.sendBillNotification(contract.tenant_id, invoice);
  }
});
```

### 7.3 การแจ้งเตือนการชำระ

```javascript
// jobs/reminder.job.js
// แจ้งเตือนก่อนถึงกำหนด 3 วัน (ทุกวัน เวลา 09:00)
cron.schedule('0 9 * * *', async () => {
  const threeDaysLater = addDays(new Date(), 3);
  
  const pendingInvoices = await Invoice.findAll({
    where: {
      status: 'pending',
      due_date: { [Op.lte]: threeDaysLater }
    },
    include: [Tenant, Room]
  });
  
  for (const invoice of pendingInvoices) {
    await lineService.sendPaymentReminder(invoice);
  }
});

// แจ้งเตือนวันเกินกำหนด
cron.schedule('0 10 * * *', async () => {
  const overdueInvoices = await Invoice.findAll({
    where: { status: 'pending', due_date: { [Op.lt]: new Date() } }
  });
  
  for (const invoice of overdueInvoices) {
    await Invoice.update({ status: 'overdue' }, { where: { id: invoice.id } });
    await lineService.sendOverdueNotification(invoice);
  }
});
```

---

## 8. การแจ้งเตือนไลน์

### ใช้อะไรฟรี?

| ช่องทาง | ฟรีไหม | เหมาะกับ |
|---------|:------:|---------|
| **LINE Notify** | ✅ ฟรี (deprecated 2025) | แจ้งเตือน Admin |
| **LINE Messaging API** (Free Tier) | ✅ 200 msg/เดือน | แจ้งเตือนผู้เช่า |
| **LINE OA** (Free Plan) | ✅ 500 msg/เดือน | หอพักขนาดเล็ก |
| **LINE LIFF** | ✅ ฟรี | Mini App ใน LINE |
| **LINE Login** | ✅ ฟรี | Login ด้วยบัญชีไลน์ |

### แนะนำ: LINE OA + LINE Messaging API

```
สำหรับหอพักขนาดเล็ก-กลาง (< 500 msg/เดือน):
✅ LINE OA Free Plan — 500 messages ฟรีต่อเดือน
✅ LINE Login — ผู้เช่า login ด้วยบัญชีไลน์
✅ LINE LIFF — Web app เปิดใน LINE Chat ได้เลย
```

### LINE Service Implementation

```javascript
// services/line.service.js
const line = require('@line/bot-sdk');

const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

const templates = {
  // แจ้งบิลรายเดือน
  monthlyBill: (invoice) => ({
    type: 'flex',
    altText: `แจ้งค่าเช่าเดือน ${invoice.period_month}/${invoice.period_year}`,
    contents: {
      type: 'bubble',
      header: { type: 'box', layout: 'vertical',
        backgroundColor: '#FF6B6B',
        contents: [{ type: 'text', text: '🏠 แจ้งค่าเช่าประจำเดือน',
          color: '#FFFFFF', weight: 'bold' }]
      },
      body: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: `ห้อง ${invoice.room_number}`, weight: 'bold', size: 'xl' },
          { type: 'separator' },
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'ค่าห้อง' },
            { type: 'text', text: `${invoice.room_price.toLocaleString()} ฿`, align: 'end' }
          ]},
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'ค่าน้ำ' },
            { type: 'text', text: `${invoice.water_amount.toLocaleString()} ฿`, align: 'end' }
          ]},
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'ค่าไฟ' },
            { type: 'text', text: `${invoice.elec_amount.toLocaleString()} ฿`, align: 'end' }
          ]},
          { type: 'separator' },
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'รวมทั้งสิ้น', weight: 'bold', color: '#FF6B6B' },
            { type: 'text', text: `${invoice.total.toLocaleString()} ฿`, 
              weight: 'bold', color: '#FF6B6B', align: 'end' }
          ]},
          { type: 'text', text: `ครบกำหนด: ${formatDate(invoice.due_date)}`,
            color: '#888888', size: 'sm' }
        ]
      },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [{ type: 'button', style: 'primary',
          color: '#06C755',
          action: { type: 'uri', label: '💳 ชำระเงิน',
            uri: `${process.env.APP_URL}/tenant/payment/${invoice.id}` }
        }]
      }
    }
  }),
  
  // แจ้งเตือนใกล้ถึงกำหนด
  paymentReminder: (invoice, daysLeft) => ({ ... }),
  
  // แจ้งเกินกำหนด
  overdueNotice: (invoice) => ({ ... }),
  
  // ยืนยันรับชำระ
  paymentConfirmed: (invoice, payment) => ({ ... }),
  
  // แจ้งสถานะแจ้งซ่อม
  maintenanceUpdate: (request) => ({ ... })
};

async function sendToTenant(tenantId, messageTemplate) {
  const tenant = await Tenant.findByPk(tenantId, { include: [User] });
  if (!tenant?.user?.line_user_id) return;
  
  await client.pushMessage(tenant.user.line_user_id, messageTemplate);
}
```

### LINE Webhook (รับข้อความจากผู้เช่า)

```javascript
// รับคำสั่งพื้นฐานผ่านไลน์
// ผู้เช่าพิมพ์: "บิล" → ส่งบิลล่าสุด
// ผู้เช่าพิมพ์: "แจ้งซ่อม" → เปิด LIFF แจ้งซ่อม
// ผู้เช่าพิมพ์: "แจ้งออก" → เปิด LIFF แจ้งออก
```

---

## 9. API Endpoints

### Authentication
```
POST   /api/auth/login              — Login (email/password หรือ LINE)
POST   /api/auth/logout
POST   /api/auth/refresh-token
GET    /api/auth/me                 — ข้อมูลผู้ใช้ปัจจุบัน
POST   /api/auth/line-callback      — LINE OAuth callback
```

### Property & Rooms
```
GET    /api/properties              — รายการหอพัก
POST   /api/properties              — เพิ่มหอพัก [admin]
PUT    /api/properties/:id          — แก้ไขหอพัก [admin]
GET    /api/properties/:id/floors   — รายการชั้น
POST   /api/properties/:id/floors   — เพิ่มชั้น [admin]
GET    /api/rooms                   — รายการห้อง (filter: status, floor)
POST   /api/rooms                   — เพิ่มห้อง [admin]
PUT    /api/rooms/:id               — แก้ไขห้อง [admin]
DELETE /api/rooms/:id               — ลบห้อง [admin]
GET    /api/rooms/:id               — รายละเอียดห้อง
PUT    /api/rooms/:id/status        — เปลี่ยนสถานะห้อง
GET    /api/room-types              — ประเภทห้อง
POST   /api/room-types              — เพิ่มประเภทห้อง [admin]
```

### Tenants & Contracts
```
GET    /api/tenants                 — รายการผู้เช่า
POST   /api/tenants                 — เพิ่มผู้เช่า
PUT    /api/tenants/:id             — แก้ไขข้อมูลผู้เช่า
GET    /api/contracts               — รายการสัญญา
POST   /api/contracts               — ทำสัญญาเช่า [admin]
PUT    /api/contracts/:id/terminate — ยกเลิกสัญญา
POST   /api/contracts/request       — ผู้เช่าขอเช่าห้อง [tenant]
POST   /api/contracts/:id/moveout   — แจ้งออก [tenant]
```

### Meter Readings
```
GET    /api/meters                  — รายการมิเตอร์
POST   /api/meters                  — บันทึกมิเตอร์
PUT    /api/meters/:id              — แก้ไขมิเตอร์
GET    /api/meters/room/:roomId     — ประวัติมิเตอร์ของห้อง
POST   /api/meters/bulk             — บันทึกมิเตอร์หลายห้อง
```

### Invoices & Billing
```
GET    /api/invoices                — รายการบิล
POST   /api/invoices                — สร้างบิล (manual) [admin]
POST   /api/invoices/generate       — สร้างบิลอัตโนมัติ (ทุกห้อง) [admin]
GET    /api/invoices/:id            — รายละเอียดบิล
PUT    /api/invoices/:id            — แก้ไขบิล [admin]
DELETE /api/invoices/:id/void       — ยกเลิกบิล [admin]
GET    /api/invoices/:id/pdf        — Download PDF บิล
GET    /api/invoices/:id/receipt    — Download PDF ใบเสร็จ
GET    /api/invoices/my             — บิลของฉัน [tenant]
```

### Payments
```
POST   /api/payments                — บันทึกรับชำระ [admin/staff]
POST   /api/payments/slip           — แจ้งชำระพร้อมสลิป [tenant]
PUT    /api/payments/:id/confirm    — ยืนยันการชำระ [admin]
PUT    /api/payments/:id/reject     — ปฏิเสธการชำระ [admin]
GET    /api/payments/history        — ประวัติการชำระ
```

### Promotions
```
GET    /api/promotions              — รายการโปรโมชั่น
POST   /api/promotions              — สร้างโปรโมชั่น [admin]
PUT    /api/promotions/:id          — แก้ไขโปรโมชั่น [admin]
DELETE /api/promotions/:id          — ลบโปรโมชั่น [admin]
POST   /api/promotions/check        — ตรวจสอบโปรโมชั่น
```

### Maintenance
```
GET    /api/maintenance             — รายการแจ้งซ่อม
POST   /api/maintenance             — แจ้งซ่อม
PUT    /api/maintenance/:id/status  — อัพเดทสถานะ [admin/staff]
POST   /api/maintenance/:id/rate    — ให้คะแนน [tenant]
```

### Settings & Reports
```
GET    /api/settings                — ดึงการตั้งค่า
PUT    /api/settings                — บันทึกการตั้งค่า [admin]
POST   /api/settings/upload-qr      — อัปโหลด QR Code [admin]
GET    /api/reports/dashboard       — Dashboard summary
GET    /api/reports/revenue         — รายงานรายได้
GET    /api/reports/occupancy       — รายงาน Occupancy
GET    /api/reports/overdue         — รายงานค้างชำระ
```

### LINE Webhook
```
POST   /api/line/webhook            — LINE Messaging API webhook
POST   /api/line/login-callback     — LINE Login callback
```

---

## 10. UI/UX Design System

### Color Palette
```css
:root {
  /* Primary — Warm Orange (โทนหอพัก อบอุ่น) */
  --color-primary:        #F97316;
  --color-primary-hover:  #EA6A00;
  --color-primary-light:  #FFF7ED;

  /* Success — ยืนยัน/สำเร็จ (เขียว) */
  --color-success:        #16A34A;
  --color-success-hover:  #15803D;
  --color-success-light:  #F0FDF4;

  /* Danger — ยกเลิก/ลบ (แดง) */
  --color-danger:         #DC2626;
  --color-danger-hover:   #B91C1C;
  --color-danger-light:   #FEF2F2;

  /* Warning — เตือน (เหลือง) */
  --color-warning:        #D97706;
  --color-warning-hover:  #B45309;
  --color-warning-light:  #FFFBEB;

  /* Info — ข้อมูล (ฟ้า) */
  --color-info:           #2563EB;
  --color-info-hover:     #1D4ED8;
  --color-info-light:     #EFF6FF;

  /* Neutral */
  --color-bg:             #F9FAFB;
  --color-surface:        #FFFFFF;
  --color-border:         #E5E7EB;
  --color-text:           #111827;
  --color-text-muted:     #6B7280;

  /* Sidebar */
  --color-sidebar:        #1F2937;
  --color-sidebar-text:   #F3F4F6;
  --color-sidebar-active: #F97316;
}
```

### Button System (Hover สม่ำเสมอทุกที่)
```css
/* ✅ ยืนยัน — เขียว */
.btn-confirm {
  background: var(--color-success);
  color: white;
  transition: background 0.2s, transform 0.1s;
}
.btn-confirm:hover {
  background: var(--color-success-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
}

/* ❌ ยกเลิก/ลบ — แดง */
.btn-cancel, .btn-delete {
  background: var(--color-danger);
  color: white;
}
.btn-cancel:hover, .btn-delete:hover {
  background: var(--color-danger-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

/* 🔵 หลัก/เพิ่ม — ส้ม (Primary) */
.btn-primary {
  background: var(--color-primary);
  color: white;
}
.btn-primary:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.35);
}
```

### Responsive Breakpoints
```
Mobile:  < 640px   (sm)
Tablet:  640-1024px (md/lg)
Desktop: > 1024px  (xl)
```

### Font
```
Thai + EN: Noto Sans Thai + Noto Sans (Google Fonts)
Heading: IBM Plex Sans Thai (น้ำหนักตัวอักษรดี)
Monospace: JetBrains Mono (สำหรับตัวเลข/code)
```

---

## 11. การตั้งค่าและติดตั้ง

### Requirements
```
Node.js >= 20 LTS
PostgreSQL >= 14
Redis >= 7
Docker & Docker Compose (recommended)
```

### Environment Variables (.env)
```env
# App
NODE_ENV=production
PORT=3001
APP_URL=https://your-domain.com
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dormitory_db
DB_USER=dorm_user
DB_PASS=your-db-password

# Redis
REDIS_URL=redis://localhost:6379

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-token
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_LIFF_ID=your-liff-id

# Frontend
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID=your-line-login-channel-id

# Upload
MAX_FILE_SIZE=10mb
UPLOAD_PATH=./uploads
```

### Docker Compose (Quick Start)
```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: dormitory_db
      POSTGRES_USER: dorm_user
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    restart: unless-stopped

  backend:
    build: ./backend
    depends_on: [postgres, redis]
    environment:
      NODE_ENV: production
    env_file: .env
    ports:
      - "3001:3001"
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped

  frontend:
    build: ./frontend
    depends_on: [backend]
    env_file: .env
    ports:
      - "3000:3000"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf
      - ./certbot:/etc/letsencrypt
    depends_on: [backend, frontend]
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
```

### Quick Setup Commands
```bash
# 1. Clone และตั้งค่า
git clone https://github.com/yourname/dormitory-system.git
cd dormitory-system
cp .env.example .env
# แก้ไข .env ตามต้องการ

# 2. Development
cd backend && npm install
cd ../frontend && npm install
docker-compose up -d postgres redis  # เฉพาะ DB
npm run dev  # ทั้ง backend + frontend

# 3. Production
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Database migration
cd backend
npm run db:migrate
npm run db:seed  # ข้อมูลตัวอย่าง
```

---

## 12. การรองรับ Offline (PWA)

### Service Worker Strategy
```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    // Cache API responses
    { urlPattern: /\/api\/rooms/, handler: 'NetworkFirst',
      options: { cacheName: 'api-rooms', expiration: { maxAge: 60 * 5 } } },
    { urlPattern: /\/api\/invoices\/my/, handler: 'NetworkFirst',
      options: { cacheName: 'api-invoices', expiration: { maxAge: 60 * 60 } } },
    // Cache static assets
    { urlPattern: /\.(js|css|png|jpg|svg|woff2)$/, handler: 'CacheFirst',
      options: { cacheName: 'static-assets', expiration: { maxAgeSeconds: 86400 * 30 } } }
  ]
});
```

### Offline Features
- ✅ ดูบิลล่าสุดได้ (cached)
- ✅ ดูข้อมูลห้องของตัวเองได้
- ✅ เพิ่มแจ้งซ่อมแบบ offline (sync เมื่อออนไลน์)
- ✅ Install as App บนมือถือ (Add to Home Screen)

---

## 13. แผนการพัฒนาต่อ

### Phase 1 — MVP (ปัจจุบัน)
- [x] จัดการห้อง/ชั้น/หอพัก
- [x] จัดการผู้เช่า/สัญญา
- [x] บันทึกมิเตอร์
- [x] ออกบิล/ใบเสร็จ (4 ประเภท)
- [x] แจ้งเตือนไลน์
- [x] PWA (offline support)
- [x] Responsive (mobile + desktop)

### Phase 2 — Enhanced
- [ ] แดชบอร์ดรายงานขั้นสูง (Chart, Export Excel/PDF)
- [ ] ระบบสัญญาดิจิทัล (e-Signature)
- [ ] รองรับหลาย Property (Multi-property)
- [ ] LINE LIFF Mini App
- [ ] ระบบ Staff Time Tracking
- [ ] Automated late fee calculation

### Phase 3 — SaaS Ready
- [ ] Multi-tenant SaaS (หลายหอพักบนระบบเดียว)
- [ ] Subscription plan management
- [ ] White-label support
- [ ] Mobile App (React Native)
- [ ] IoT Smart Meter integration

### Phase 4 — POS Extension (แยก Module)
- [ ] หน้าจอ POS สำหรับรับชำระ
- [ ] Barcode/QR Scanner
- [ ] Receipt printer integration (Thermal)
- [ ] Cash drawer integration
- [ ] Daily cash report

---

## 📦 Dependencies Summary

### Backend
```json
{
  "dependencies": {
    "express": "^4.18",
    "sequelize": "^6.35",
    "pg": "^8.11",
    "redis": "^4.6",
    "bull": "^4.11",
    "node-cron": "^3.0",
    "jsonwebtoken": "^9.0",
    "bcryptjs": "^2.4",
    "multer": "^1.4",
    "sharp": "^0.33",
    "pdfkit": "^0.15",
    "socket.io": "^4.7",
    "@line/bot-sdk": "^7.5",
    "axios": "^1.6",
    "dayjs": "^1.11",
    "joi": "^17.11",
    "winston": "^3.11",
    "helmet": "^7.1",
    "cors": "^2.8",
    "compression": "^1.7",
    "dotenv": "^16.3"
  }
}
```

### Frontend
```json
{
  "dependencies": {
    "next": "^14.0",
    "react": "^18.2",
    "typescript": "^5.3",
    "tailwindcss": "^3.4",
    "@shadcn/ui": "latest",
    "zustand": "^4.4",
    "@tanstack/react-query": "^5.0",
    "react-hook-form": "^7.49",
    "zod": "^3.22",
    "chart.js": "^4.4",
    "react-chartjs-2": "^5.2",
    "jspdf": "^2.5",
    "html2canvas": "^1.4",
    "qrcode": "^1.5",
    "next-pwa": "^5.6",
    "socket.io-client": "^4.7",
    "dayjs": "^1.11",
    "axios": "^1.6",
    "lucide-react": "latest"
  }
}
```

---

## 🔒 Security Checklist

- [x] JWT token rotation
- [x] Password hashing (bcrypt, salt=12)
- [x] Rate limiting (express-rate-limit)
- [x] Input validation (Joi/Zod)
- [x] SQL injection prevention (Sequelize parameterized queries)
- [x] XSS protection (Helmet)
- [x] CORS configuration
- [x] File upload validation (type + size)
- [x] Role-based access control (RBAC)
- [x] HTTPS enforcement (nginx)
- [x] Sensitive data masking in logs
- [x] Environment variable management

---

## 📊 Performance Considerations

- **Database:** Indexes on frequently queried columns
- **Caching:** Redis for settings, session, API responses
- **Images:** Sharp for compression, lazy loading on frontend
- **Pagination:** Cursor-based pagination for large datasets
- **Background Jobs:** Bull queue for heavy operations (PDF gen, LINE notify)
- **CDN:** Static assets via CDN in production

---

*Generated for Dormitory Management System v1.0*  
*© 2025 — All Rights Reserved*
