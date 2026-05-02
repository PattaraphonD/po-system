import crypto from 'crypto';
import { queryOne } from '../db/client.js';

export function genId(prefix = '') {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  return prefix ? `${prefix}_${id}` : id;
}

export async function generatePONumber(db) {
  const year = new Date().getFullYear();
  const row = await queryOne(
    `SELECT COUNT(*) as cnt FROM purchase_orders WHERE po_number LIKE $1`,
    [`PO-${year}-%`]
  );
  const seq = String(Number(row?.cnt ?? 0) + 1).padStart(4, '0');
  return `PO-${year}-${seq}`;
}

export function calcVAT(subtotal, vatPct = 7) {
  const vat = Math.round(subtotal * vatPct) / 100;
  return { subtotal: Number(subtotal), vat_amount: vat, grand_total: Number(subtotal) + vat };
}

export function formatTHB(n) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
