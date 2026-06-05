const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.generateInvoicePdf = async (invoice, tenant, room) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      
      const uploadsDir = path.join(__dirname, '../../public/uploads/invoices');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `INV-${invoice.invoice_number}.pdf`;
      const filePath = path.join(uploadsDir, fileName);
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // Register Font
      const fontPath = path.join(__dirname, '../../assets/fonts/Sarabun-Regular.ttf');
      const fontBoldPath = path.join(__dirname, '../../assets/fonts/Sarabun-Bold.ttf');
      let fontName = 'Helvetica';
      let fontBoldName = 'Helvetica-Bold';
      
      if (fs.existsSync(fontPath)) {
        doc.registerFont('Sarabun', fontPath);
        fontName = 'Sarabun';
        fontBoldName = 'Sarabun'; // Fallback if bold missing
      }
      if (fs.existsSync(fontBoldPath)) {
        doc.registerFont('Sarabun-Bold', fontBoldPath);
        fontBoldName = 'Sarabun-Bold';
      }

      // Add Watermark
      const watermarkPath = path.join(__dirname, '../../assets/images/watermark.png');
      if (fs.existsSync(watermarkPath)) {
        doc.image(watermarkPath, 150, 300, { width: 300, opacity: 0.1 });
      }

      // Add Logo
      const logoPath = path.join(__dirname, '../../assets/images/logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 40, { width: 80 });
      }

      // Header: Company Info
      doc.font(fontBoldName).fontSize(24).text('หอพักสำรวย (SAMRUAY SPACE)', 140, 50);
      doc.font(fontName).fontSize(12).text('123 ถนนตัวอย่าง ตำบลตัวอย่าง อำเภอตัวอย่าง 10000', 140, 80);
      doc.text('โทรศัพท์: 081-234-5678', 140, 95);

      // Header: Document Title
      doc.font(fontBoldName).fontSize(20).text('ใบแจ้งหนี้ / บิลเงินสด', 50, 130, { align: 'center' });
      doc.moveDown();

      // Info Box (Left: Customer, Right: Invoice details)
      doc.rect(50, 170, 500, 70).stroke('#cccccc');
      
      doc.font(fontBoldName).fontSize(12).text('ชื่อลูกค้า:', 60, 180);
      doc.font(fontName).text(`${tenant.user?.first_name} ${tenant.user?.last_name}`, 110, 180);
      doc.font(fontBoldName).text('ห้องพักเลขที่:', 60, 200);
      doc.font(fontName).text(room.room_number, 130, 200);
      doc.font(fontBoldName).text('รอบบิลเดือน:', 60, 220);
      doc.font(fontName).text(`${invoice.period_month}/${invoice.period_year}`, 130, 220);

      doc.font(fontBoldName).text('เลขที่บิล:', 350, 180);
      doc.font(fontName).text(invoice.invoice_number, 410, 180);
      doc.font(fontBoldName).text('วันที่ออกบิล:', 350, 200);
      doc.font(fontName).text(new Date(invoice.issue_date || Date.now()).toLocaleDateString('th-TH'), 410, 200);
      doc.font(fontBoldName).text('กำหนดชำระ:', 350, 220);
      doc.font(fontName).text(new Date(invoice.due_date).toLocaleDateString('th-TH'), 410, 220);

      // Table Header
      const tableTop = 270;
      doc.rect(50, tableTop, 500, 25).fillAndStroke('#f0f0f0', '#000000');
      doc.fillColor('#000000').font(fontBoldName);
      doc.text('ลำดับ', 60, tableTop + 6);
      doc.text('รายการ (Description)', 110, tableTop + 6);
      doc.text('จำนวนหน่วย', 330, tableTop + 6, { width: 70, align: 'right' });
      doc.text('จำนวนเงิน (บาท)', 420, tableTop + 6, { width: 120, align: 'right' });
      
      // Table Content
      doc.font(fontName);
      let y = tableTop + 35;
      let itemIndex = 1;

      // Draw vertical lines
      const drawTableLines = (bottomY) => {
        doc.moveTo(50, tableTop).lineTo(50, bottomY).stroke();
        doc.moveTo(100, tableTop).lineTo(100, bottomY).stroke();
        doc.moveTo(330, tableTop).lineTo(330, bottomY).stroke();
        doc.moveTo(420, tableTop).lineTo(420, bottomY).stroke();
        doc.moveTo(550, tableTop).lineTo(550, bottomY).stroke();
        doc.moveTo(50, bottomY).lineTo(550, bottomY).stroke();
      };

      const addItem = (desc, qty, amount) => {
        doc.text(itemIndex.toString(), 60, y);
        doc.text(desc, 110, y);
        doc.text(qty, 330, y, { width: 70, align: 'right' });
        doc.text(parseFloat(amount).toLocaleString('th-TH', { minimumFractionDigits: 2 }), 420, y, { width: 120, align: 'right' });
        y += 25;
        itemIndex++;
      };

      // Room
      if (invoice.room_price > 0) {
        addItem('ค่าเช่าห้องพักรายเดือน', '1 เดือน', invoice.room_price);
      }

      // Water
      if (invoice.water_amount > 0) {
        addItem(`ค่าน้ำประปา (มิเตอร์ ${invoice.water_previous || 0} - ${invoice.water_current || 0})`, `${invoice.water_units} หน่วย`, invoice.water_amount);
      }

      // Elec
      if (invoice.elec_amount > 0) {
        addItem(`ค่าไฟฟ้า (มิเตอร์ ${invoice.elec_previous || 0} - ${invoice.elec_current || 0})`, `${invoice.elec_units} หน่วย`, invoice.elec_amount);
      }

      // Late Fee
      if (invoice.late_fee > 0) {
        addItem('ค่าปรับชำระล่าช้า', '-', invoice.late_fee);
      }

      // Fill rest of the table with empty space
      const tableBottom = Math.max(y + 20, 500);
      drawTableLines(tableBottom);

      // Total Section
      doc.rect(330, tableBottom, 220, 30).stroke();
      doc.font(fontBoldName).fontSize(14).text('ยอดรวมสุทธิ (Total):', 340, tableBottom + 8);
      doc.text(parseFloat(invoice.total).toLocaleString('th-TH', { minimumFractionDigits: 2 }), 420, tableBottom + 8, { width: 120, align: 'right' });

      // Notes
      if (invoice.notes) {
        doc.font(fontName).fontSize(10).text(`หมายเหตุ: ${invoice.notes}`, 50, tableBottom + 10);
      }

      // Payment Details
      const paymentY = tableBottom + 50;
      doc.font(fontBoldName).fontSize(12).text('ช่องทางการชำระเงิน:', 50, paymentY);
      doc.font(fontName).text('ธนาคาร: กสิกรไทย (KBANK)', 50, paymentY + 20);
      doc.text('เลขที่บัญชี: 123-4-56789-0', 50, paymentY + 35);
      doc.text('ชื่อบัญชี: บจก. สำรวยสเปซ', 50, paymentY + 50);

      // Signatures
      const sigY = paymentY + 100;
      
      // Receiver Signature
      doc.moveTo(100, sigY).lineTo(250, sigY).stroke();
      doc.text('(                                         )', 110, sigY + 10);
      doc.text('ผู้รับเงิน / Authorized Signature', 110, sigY + 30);
      doc.text(`วันที่ ....... / ....... / .......`, 125, sigY + 50);

      // Payer Signature
      doc.moveTo(350, sigY).lineTo(500, sigY).stroke();
      doc.text('(                                         )', 360, sigY + 10);
      doc.text('ผู้จ่ายเงิน / Payer Signature', 370, sigY + 30);
      doc.text(`วันที่ ....... / ....... / .......`, 375, sigY + 50);

      doc.end();

      writeStream.on('finish', () => {
        resolve(`/uploads/invoices/${fileName}`);
      });
      writeStream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};
