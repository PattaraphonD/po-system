import { Hono } from 'hono';
import { Env } from '../types';

const reports = new Hono<{ Bindings: Env }>();

// GET /api/reports/summary
reports.get('/summary', async (c) => {
  const [totals, byStatus, bySupplier, monthly] = await Promise.all([
    c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_pos,
        COALESCE(SUM(CASE WHEN status NOT IN ('rejected','draft') THEN grand_total END), 0) as total_spend,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN grand_total END), 0) as approved_spend,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as pending_approval,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as drafts,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM purchase_orders`).first(),

    c.env.DB.prepare(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(grand_total),0) as total
      FROM purchase_orders GROUP BY status ORDER BY count DESC`).all(),

    c.env.DB.prepare(`
      SELECT s.name as supplier, COUNT(po.id) as po_count,
             COALESCE(SUM(po.grand_total),0) as total_spend
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.status NOT IN ('rejected','draft')
      GROUP BY po.supplier_id ORDER BY total_spend DESC LIMIT 10`).all(),

    c.env.DB.prepare(`
      SELECT strftime('%Y-%m', order_date) as month,
             COUNT(*) as count,
             COALESCE(SUM(grand_total),0) as total
      FROM purchase_orders
      WHERE order_date >= date('now', '-12 months')
      GROUP BY month ORDER BY month ASC`).all(),
  ]);

  return c.json({
    summary: totals,
    by_status: byStatus.results,
    by_supplier: bySupplier.results,
    monthly: monthly.results,
  });
});

// GET /api/reports/export (CSV)
reports.get('/export', async (c) => {
  const { from, to, status } = c.req.query();
  let query = `
    SELECT po.po_number, po.status, po.order_date, po.delivery_date,
           s.name as supplier, po.subtotal, po.vat_amount, po.grand_total,
           po.requested_by_name, po.approved_by_name, po.approved_at, po.notes
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id = po.supplier_id WHERE 1=1`;
  const binds: string[] = [];
  if (status) { query += ' AND po.status = ?'; binds.push(status); }
  if (from) { query += ' AND po.order_date >= ?'; binds.push(from); }
  if (to)   { query += ' AND po.order_date <= ?'; binds.push(to); }
  query += ' ORDER BY po.order_date DESC';

  const { results } = await c.env.DB.prepare(query).bind(...binds).all<any>();

  const headers = ['PO Number','Status','Order Date','Delivery Date','Supplier',
    'Subtotal','VAT','Grand Total','Requested By','Approved By','Approved At','Notes'];
  const rows = results.map((r: any) => [
    r.po_number, r.status, r.order_date, r.delivery_date || '',
    r.supplier, r.subtotal, r.vat_amount, r.grand_total,
    r.requested_by_name || '', r.approved_by_name || '',
    r.approved_at || '', r.notes || ''
  ].map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="po-export-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
});

export default reports;
