import { Hono } from 'hono';
import { query, queryOne } from '../db/client.js';

const reports = new Hono();

// GET /api/reports/summary
reports.get('/summary', async (c) => {
  const [totals, byStatus, bySupplier, monthly] = await Promise.all([
    queryOne(`
      SELECT
        COUNT(*)::int                                                           AS total_pos,
        COALESCE(SUM(CASE WHEN status NOT IN ('rejected','draft') THEN grand_total END),0)::float AS total_spend,
        COALESCE(SUM(CASE WHEN status = 'approved'  THEN grand_total END),0)::float AS approved_spend,
        COUNT(CASE WHEN status = 'submitted'  THEN 1 END)::int                 AS pending_approval,
        COUNT(CASE WHEN status = 'draft'      THEN 1 END)::int                 AS drafts,
        COUNT(CASE WHEN status = 'approved'   THEN 1 END)::int                 AS approved,
        COUNT(CASE WHEN status = 'rejected'   THEN 1 END)::int                 AS rejected
      FROM purchase_orders
    `),
    query(`
      SELECT status, COUNT(*)::int AS count, COALESCE(SUM(grand_total),0)::float AS total
      FROM purchase_orders GROUP BY status ORDER BY count DESC
    `),
    query(`
      SELECT s.name AS supplier, COUNT(po.id)::int AS po_count,
             COALESCE(SUM(po.grand_total),0)::float AS total_spend
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.status NOT IN ('rejected','draft')
      GROUP BY po.supplier_id, s.name
      ORDER BY total_spend DESC LIMIT 10
    `),
    query(`
      SELECT TO_CHAR(order_date,'YYYY-MM') AS month,
             COUNT(*)::int                 AS count,
             COALESCE(SUM(grand_total),0)::float AS total
      FROM purchase_orders
      WHERE order_date >= NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month ASC
    `),
  ]);

  return c.json({
    summary: totals,
    by_status: byStatus,
    by_supplier: bySupplier,
    monthly,
  });
});

// GET /api/reports/export — CSV download
reports.get('/export', async (c) => {
  const { from, to, status } = c.req.query();
  const conditions = ['1=1'];
  const vals = [];
  if (status) { vals.push(status); conditions.push(`po.status = $${vals.length}`); }
  if (from)   { vals.push(from);   conditions.push(`po.order_date >= $${vals.length}`); }
  if (to)     { vals.push(to);     conditions.push(`po.order_date <= $${vals.length}`); }

  const rows = await query(`
    SELECT po.po_number, po.status, po.order_date, po.delivery_date,
           s.name AS supplier, po.subtotal, po.vat_amount, po.grand_total,
           po.requested_by_name, po.approved_by_name, po.approved_at, po.notes
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id = po.supplier_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY po.order_date DESC
  `, vals);

  const headers = ['PO Number','Status','Order Date','Delivery Date','Supplier',
    'Subtotal','VAT','Grand Total','Requested By','Approved By','Approved At','Notes'];

  const csvRows = rows.map(r =>
    [r.po_number, r.status, r.order_date?.toISOString?.().slice(0,10) || '',
     r.delivery_date?.toISOString?.().slice(0,10) || '',
     r.supplier, r.subtotal, r.vat_amount, r.grand_total,
     r.requested_by_name || '', r.approved_by_name || '',
     r.approved_at?.toISOString?.().slice(0,10) || '', r.notes || '']
    .map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')
  );

  const csv = [headers.join(','), ...csvRows].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="po-export-${new Date().toISOString().slice(0,10)}.csv"`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Disposition',
    },
  });
});

export default reports;
