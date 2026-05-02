import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatTHB, formatDate } from './utils';

export function generatePOPdf(po: any) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = 210; const margin = 15;

  // Header bar
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, w, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PURCHASE ORDER', margin, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(po.po_number, w - margin, 14, { align: 'right' });

  // Company info
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Microchip Technology (Thailand) Co., Ltd.', margin, 30);
  doc.setFont('helvetica', 'normal');
  doc.text('14 Moo 1, T. Wangtakhien, A. Muangchachemgsao, Chachemgsao 24000', margin, 35);

  // Status badge
  const statusColors: Record<string, number[]> = {
    draft: [156,163,175], submitted: [59,130,246], in_review: [245,158,11],
    approved: [16,185,129], rejected: [239,68,68], ordered: [99,102,241],
  };
  const sc = statusColors[po.status] || [156,163,175];
  doc.setFillColor(sc[0], sc[1], sc[2]);
  doc.roundedRect(w - margin - 28, 26, 28, 8, 2, 2, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(po.status.toUpperCase(), w - margin - 14, 31.5, { align: 'center' });

  // Divider
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, 42, w - margin, 42);

  // Supplier & PO info boxes
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('SUPPLIER', margin, 49);
  doc.text('ORDER DETAILS', 115, 49);

  doc.setFont('helvetica', 'normal');
  doc.text(po.supplier_name || '', margin, 55);
  if (po.supplier_address) doc.text(po.supplier_address, margin, 60, { maxWidth: 85 });
  if (po.supplier_phone) doc.text(`Tel: ${po.supplier_phone}`, margin, 70);
  if (po.supplier_email) doc.text(`Email: ${po.supplier_email}`, margin, 75);

  const details = [
    ['PO Number:', po.po_number],
    ['Order Date:', formatDate(po.order_date)],
    ['Delivery Date:', formatDate(po.delivery_date)],
    ['Requested By:', po.requested_by_name || ''],
    ['Approved By:', po.approved_by_name || '—'],
    ['Status:', po.status?.toUpperCase()],
  ];
  details.forEach(([label, val], i) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 115, 55 + i * 6);
    doc.setFont('helvetica', 'normal');
    doc.text(String(val), 148, 55 + i * 6);
  });

  // Items table
  doc.line(margin, 82, w - margin, 82);
  autoTable(doc, {
    startY: 86,
    margin: { left: margin, right: margin },
    head: [['#', 'Description', 'Qty', 'Unit', 'Unit Price (฿)', 'Amount (฿)']],
    body: (po.items || []).map((item: any, i: number) => [
      i + 1,
      item.description,
      item.quantity,
      item.unit || 'EA',
      formatTHB(item.unit_price),
      formatTHB(item.amount),
    ]),
    headStyles: { fillColor: [30, 64, 175], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 80 },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    didDrawPage: () => {},
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // Totals box
  const totalsX = 120;
  doc.setFontSize(8);
  const totals = [
    ['Subtotal:', formatTHB(po.subtotal)],
    [`VAT (${po.vat_pct || 7}%):`, formatTHB(po.vat_amount)],
  ];
  totals.forEach(([label, val], i) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, totalsX, finalY + i * 6);
    doc.text(val, w - margin, finalY + i * 6, { align: 'right' });
  });
  doc.line(totalsX, finalY + 12, w - margin, finalY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Grand Total:', totalsX, finalY + 18);
  doc.text(`฿ ${formatTHB(po.grand_total)}`, w - margin, finalY + 18, { align: 'right' });

  // Notes
  if (po.notes) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', margin, finalY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(po.notes, margin, finalY + 12, { maxWidth: 90 });
  }

  // Signature block
  const sigY = finalY + 40;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.line(margin, sigY + 12, margin + 50, sigY + 12);
  doc.text('Requested By', margin + 10, sigY + 17);
  doc.line(115, sigY + 12, 165, sigY + 12);
  doc.text('Approved By', 125, sigY + 17);

  // Footer
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 285, w, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(`Generated: ${new Date().toLocaleString('th-TH')} — PO System, Microchip Technology Thailand`, w / 2, 292, { align: 'center' });

  doc.save(`${po.po_number}.pdf`);
}
