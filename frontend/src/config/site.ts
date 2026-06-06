/**
 * SAMRUAY SPACE — White-label Site Configuration
 * ─────────────────────────────────────────────
 * ตั้งค่าชื่อแบรนด์และโลโก้จากไฟล์นี้จุดเดียว
 * เวลาขาย template ให้ลูกค้าใหม่ → เปลี่ยนแค่ไฟล์นี้
 *
 * ENV Override (optional):
 *   NEXT_PUBLIC_BRAND_NAME=ชื่อหอพัก
 *   NEXT_PUBLIC_BRAND_LOGO=/logo.png
 *   NEXT_PUBLIC_BRAND_TAGLINE=คำอธิบายระยะสั้น
 */

export const siteConfig = {
  /** ชื่อแบรนด์ที่แสดงในระบบ */
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? 'SAMRUAY SPACE',

  /** ชื่อย่อ (สำหรับ sidebar แบบ collapsed) */
  shortName: process.env.NEXT_PUBLIC_BRAND_SHORT ?? 'SS',

  /** คำอธิบายสั้น (หน้า login / meta description) */
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE ?? 'ระบบจัดการหอพักอัจฉริยะ',

  /** path รูปโลโก้ (จาก /public) */
  logoPath: process.env.NEXT_PUBLIC_BRAND_LOGO ?? '/logo.png',

  /** เปิด/ปิด multi-property selector
   *  'auto'  = โชว์เฉพาะเมื่อ properties > 1  (default)
   *  'always' = โชว์เสมอ
   *  'never'  = ซ่อนเสมอ
   */
  multiPropertyMode: (process.env.NEXT_PUBLIC_MULTI_PROPERTY_MODE ?? 'auto') as
    | 'auto'
    | 'always'
    | 'never',

  /** version ระบบ (แสดงบน sidebar footer) */
  version: '1.0.0',

  /** ลิงก์ support (แสดงบน footer) */
  supportUrl: process.env.NEXT_PUBLIC_SUPPORT_URL ?? 'https://samruayspace.com',

  /** Feature flags */
  features: {
    /** EasySlip integration — false = UI mockup, true = live API */
    easySlip: process.env.NEXT_PUBLIC_FEATURE_EASYSLIP === 'true',
    /** LINE Notify integration */
    lineNotify: process.env.NEXT_PUBLIC_FEATURE_LINE !== 'false',
    /** Promotions module */
    promotions: process.env.NEXT_PUBLIC_FEATURE_PROMOTIONS !== 'false',
  },
} as const;

export type SiteConfig = typeof siteConfig;
