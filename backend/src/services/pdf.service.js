const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.generateInvoicePdf = async (invoice, tenant, room) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      
      // Ensure the uploads directory exists
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
      if (fs.existsSync(fontPath)) {
        doc.registerFont('Sarabun', fontPath);
        doc.font('Sarabun');
      }

      // Header
      doc.fontSize(24).text('SAMRUAY SPACE', { align: 'center' });
      doc.fontSize(14).text('ใบแจ้งหนี้ / INVOICE', { align: 'center' });
      doc.moveDown();

      // Info
      doc.fontSize(12).text(`เลขที่บิล: ${invoice.invoice_number}`);
      doc.text(`วันที่ออกบิล: ${new Date(invoice.issue_date).toLocaleDateString('th-TH')}`);
      doc.text(`กำหนดชำระ: ${new Date(invoice.due_date).toLocaleDateString('th-TH')}`);
      doc.moveDown();
      
      doc.text(`ชื่อลูกค้า: ${tenant.user?.first_name} ${tenant.user?.last_name}`);
      doc.text(`ห้อง: ${room.room_number}`);
      doc.moveDown();

      // Table Header
      const tableTop = 250;
      doc.text('รายการ', 50, tableTop);
      doc.text('จำนวน', 300, tableTop);
      doc.text('ราคา', 450, tableTop);
      
      doc.moveTo(50, tableTop + 15).lineTo(500, tableTop + 15).stroke();

      // Items
      let y = tableTop + 25;
      
      // Room
      doc.text('ค่าเช่าห้องพัก', 50, y);
      doc.text('1 เดือน', 300, y);
      doc.text(`${invoice.room_price} บาท`, 450, y);
      y += 20;

      // Water
      doc.text(`ค่าน้ำ (มิเตอร์ ${invoice.water_previous} - ${invoice.water_current})`, 50, y);
      doc.text(`${invoice.water_units} หน่วย`, 300, y);
      doc.text(`${invoice.water_amount} บาท`, 450, y);
      y += 20;

      // Elec
      doc.text(`ค่าไฟ (มิเตอร์ ${invoice.elec_previous} - ${invoice.elec_current})`, 50, y);
      doc.text(`${invoice.elec_units} หน่วย`, 300, y);
      doc.text(`${invoice.elec_amount} บาท`, 450, y);
      y += 20;

      // Late Fee
      if (invoice.late_fee > 0) {
        doc.text('ค่าปรับล่าช้า', 50, y);
        doc.text('-', 300, y);
        doc.text(`${invoice.late_fee} บาท`, 450, y);
        y += 20;
      }

      doc.moveTo(50, y + 10).lineTo(500, y + 10).stroke();
      
      // Total
      y += 20;
      doc.fontSize(16).text('ยอดรวมสุทธิ (Total):', 250, y);
      doc.text(`${invoice.total} บาท`, 400, y);

      // Footer
      doc.moveDown(4);
      doc.fontSize(12).text('กรุณาชำระเงินผ่านการโอนเข้าบัญชี:', { align: 'center' });
      doc.text('ธนาคาร: กสิกรไทย (KBANK)', { align: 'center' });
      doc.text('เลขที่บัญชี: 123-4-56789-0', { align: 'center' });
      doc.text('ชื่อบัญชี: บจก. สำรวยสเปซ', { align: 'center' });
      doc.moveDown();
      doc.text('หลังจากโอนเงินแล้ว กรุณาส่งสลิปมาในแชท LINE นี้ได้เลยครับ', { align: 'center' });

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
