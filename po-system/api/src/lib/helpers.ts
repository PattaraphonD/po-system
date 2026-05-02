// Generate a short unique ID (compatible with Workers - no crypto.randomUUID issues)
export function genId(prefix = ''): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return prefix ? `${prefix}_${hex}` : hex;
}

// Generate PO number: PO-YYYY-NNNN
export async function generatePONumber(db: D1Database): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db.prepare(
    `SELECT COUNT(*) as cnt FROM purchase_orders WHERE po_number LIKE ?`
  ).bind(`PO-${year}-%`).first<{ cnt: number }>();
  const seq = ((result?.cnt ?? 0) + 1).toString().padStart(4, '0');
  return `PO-${year}-${seq}`;
}

// Calculate VAT
export function calcVAT(subtotal: number, vatPct = 7) {
  const vat = Math.round(subtotal * vatPct) / 100;
  return { subtotal, vat_amount: vat, grand_total: subtotal + vat };
}

// Format Thai Baht
export function formatTHB(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// CORS headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
