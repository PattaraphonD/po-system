import { Hono } from 'hono';
import { Env, JWTPayload, POStatus } from '../types';
import { genId, generatePONumber, calcVAT } from '../lib/helpers';
import { sendEmail, poSubmittedEmail, poApprovedEmail, poRejectedEmail } from '../lib/email';

const pos = new Hono<{ Bindings: Env }>();

// GET /api/pos
pos.get('/', async (c) => {
  const { status, supplier_id, from, to, limit = '50', offset = '0' } = c.req.query();
  let query = `
    SELECT po.*, s.name as supplier_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id = po.supplier_id
    WHERE 1=1`;
  const binds: any[] = [];
  if (status) { query += ' AND po.status = ?'; binds.push(status); }
  if (supplier_id) { query += ' AND po.supplier_id = ?'; binds.push(supplier_id); }
  if (from) { query += ' AND po.order_date >= ?'; binds.push(from); }
  if (to)   { query += ' AND po.order_date <= ?'; binds.push(to); }
  query += ` ORDER BY po.created_at DESC LIMIT ? OFFSET ?`;
  binds.push(parseInt(limit), parseInt(offset));

  const { results } = await c.env.DB.prepare(query).bind(...binds).all();

  const totalRow = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM purchase_orders po WHERE 1=1`
  ).first<{ cnt: number }>();

  return c.json({ pos: results, total: totalRow?.cnt ?? 0 });
});

// GET /api/pos/:id
pos.get('/:id', async (c) => {
  const id = c.req.param('id');
  const po = await c.env.DB.prepare(`
    SELECT po.*, s.name as supplier_name, s.address as supplier_address,
           s.phone as supplier_phone, s.email as supplier_email,
           s.contact as supplier_contact, s.tax_id as supplier_tax_id
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id = po.supplier_id
    WHERE po.id = ?`).bind(id).first();
  if (!po) return c.json({ error: 'Not found' }, 404);

  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM po_items WHERE po_id = ? ORDER BY item_no'
  ).bind(id).all();

  const { results: approvalLog } = await c.env.DB.prepare(
    'SELECT * FROM approvals WHERE po_id = ? ORDER BY created_at ASC'
  ).bind(id).all();

  return c.json({ po: { ...po, items, approvals: approvalLog } });
});

// POST /api/pos — create new PO (optionally from quotation)
pos.post('/', async (c) => {
  const user = c.get('user') as JWTPayload;
  const body = await c.req.json();
  const { quotation_id, supplier_id, delivery_date, shipping_address, notes, items = [] } = body;

  if (!supplier_id) return c.json({ error: 'supplier_id required' }, 400);

  let finalItems = items;

  // Auto-populate from quotation if provided
  if (quotation_id) {
    const { results: qItems } = await c.env.DB.prepare(
      'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY item_no'
    ).bind(quotation_id).all();
    if (qItems.length > 0) finalItems = qItems;
  }

  const subtotal = finalItems.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
  const { vat_amount, grand_total } = calcVAT(subtotal);
  const po_number = await generatePONumber(c.env.DB);
  const id = genId('po');

  await c.env.DB.prepare(`
    INSERT INTO purchase_orders (id, po_number, quotation_id, supplier_id,
      requested_by, requested_by_name, delivery_date, shipping_address,
      subtotal, vat_amount, grand_total, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, po_number, quotation_id || null, supplier_id,
    user.sub, user.name, delivery_date, shipping_address,
    subtotal, vat_amount, grand_total, notes).run();

  for (const item of finalItems) {
    await c.env.DB.prepare(`
      INSERT INTO po_items (id, po_id, item_no, description, quantity, unit, unit_price, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(genId('pi'), id, item.item_no, item.description,
      item.quantity, item.unit || 'EA', item.unit_price, item.amount).run();
  }

  // Audit log
  await c.env.DB.prepare(`
    INSERT INTO approvals (id, po_id, action, actor_id, actor_name, comment)
    VALUES (?, ?, 'created', ?, ?, 'PO created')`
  ).bind(genId('appr'), id, user.sub, user.name).run();

  const po = await c.env.DB.prepare('SELECT * FROM purchase_orders WHERE id = ?').bind(id).first();
  return c.json({ po }, 201);
});

// PATCH /api/pos/:id — update draft PO
pos.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const po = await c.env.DB.prepare('SELECT status FROM purchase_orders WHERE id = ?').bind(id).first<any>();
  if (!po) return c.json({ error: 'Not found' }, 404);
  if (!['draft', 'rejected'].includes(po.status)) {
    return c.json({ error: 'Only draft or rejected POs can be edited' }, 400);
  }

  const allowed = ['delivery_date','shipping_address','notes'];
  const updates = allowed.filter(f => f in body);
  if (updates.length > 0) {
    const set = updates.map(f => `${f} = ?`).join(', ');
    await c.env.DB.prepare(
      `UPDATE purchase_orders SET ${set}, updated_at = datetime('now') WHERE id = ?`
    ).bind(...updates.map(f => body[f]), id).run();
  }

  // Update items if provided
  if (body.items && Array.isArray(body.items)) {
    await c.env.DB.prepare('DELETE FROM po_items WHERE po_id = ?').bind(id).run();
    const subtotal = body.items.reduce((s: number, i: any) => s + Number(i.amount), 0);
    const { vat_amount, grand_total } = calcVAT(subtotal);
    for (const item of body.items) {
      await c.env.DB.prepare(`
        INSERT INTO po_items (id, po_id, item_no, description, quantity, unit, unit_price, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(genId('pi'), id, item.item_no, item.description,
        item.quantity, item.unit || 'EA', item.unit_price, item.amount).run();
    }
    await c.env.DB.prepare(
      `UPDATE purchase_orders SET subtotal=?, vat_amount=?, grand_total=?, updated_at=datetime('now') WHERE id=?`
    ).bind(subtotal, vat_amount, grand_total, id).run();
  }

  const updated = await c.env.DB.prepare('SELECT * FROM purchase_orders WHERE id=?').bind(id).first();
  return c.json({ po: updated });
});

// POST /api/pos/:id/submit
pos.post('/:id/submit', async (c) => {
  const user = c.get('user') as JWTPayload;
  const id = c.req.param('id');
  const po = await c.env.DB.prepare('SELECT * FROM purchase_orders WHERE id = ?').bind(id).first<any>();
  if (!po) return c.json({ error: 'Not found' }, 404);
  if (!['draft','rejected'].includes(po.status)) {
    return c.json({ error: `Cannot submit from status: ${po.status}` }, 400);
  }

  await c.env.DB.prepare(
    `UPDATE purchase_orders SET status='submitted', updated_at=datetime('now') WHERE id=?`
  ).bind(id).run();

  await c.env.DB.prepare(`
    INSERT INTO approvals (id, po_id, action, actor_id, actor_name)
    VALUES (?, ?, 'submitted', ?, ?)`
  ).bind(genId('appr'), id, user.sub, user.name).run();

  // Notify approvers
  const approvers = await c.env.DB.prepare(
    `SELECT email FROM users WHERE role IN ('approver','admin') AND is_active = 1`
  ).all<{ email: string }>();

  for (const approver of approvers.results) {
    const { subject, html } = poSubmittedEmail(po.po_number, 'Approver', po.grand_total);
    await sendEmail({ to: approver.email, subject, html, apiKey: c.env.RESEND_API_KEY });
  }

  return c.json({ success: true, status: 'submitted' });
});

// POST /api/pos/:id/approve
pos.post('/:id/approve', async (c) => {
  const user = c.get('user') as JWTPayload;
  if (!['approver','admin'].includes(user.role)) {
    return c.json({ error: 'Forbidden: approver role required' }, 403);
  }
  const id = c.req.param('id');
  const { comment } = await c.req.json().catch(() => ({ comment: '' }));
  const po = await c.env.DB.prepare('SELECT * FROM purchase_orders WHERE id = ?').bind(id).first<any>();
  if (!po) return c.json({ error: 'Not found' }, 404);
  if (!['submitted','in_review'].includes(po.status)) {
    return c.json({ error: `Cannot approve from status: ${po.status}` }, 400);
  }

  await c.env.DB.prepare(`
    UPDATE purchase_orders SET status='approved', approved_by=?, approved_by_name=?,
    approved_at=datetime('now'), updated_at=datetime('now') WHERE id=?`
  ).bind(user.sub, user.name, id).run();

  await c.env.DB.prepare(`
    INSERT INTO approvals (id, po_id, action, actor_id, actor_name, comment)
    VALUES (?, ?, 'approved', ?, ?, ?)`
  ).bind(genId('appr'), id, user.sub, user.name, comment || null).run();

  // Notify buyer
  const buyer = await c.env.DB.prepare(
    'SELECT email FROM users WHERE id = ?'
  ).bind(po.requested_by).first<{ email: string }>();
  if (buyer) {
    const { subject, html } = poApprovedEmail(po.po_number, po.requested_by_name, po.grand_total);
    await sendEmail({ to: buyer.email, subject, html, apiKey: c.env.RESEND_API_KEY });
  }

  return c.json({ success: true, status: 'approved' });
});

// POST /api/pos/:id/reject
pos.post('/:id/reject', async (c) => {
  const user = c.get('user') as JWTPayload;
  if (!['approver','admin'].includes(user.role)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const id = c.req.param('id');
  const { comment } = await c.req.json();
  if (!comment) return c.json({ error: 'Rejection reason required' }, 400);

  await c.env.DB.prepare(`
    UPDATE purchase_orders SET status='rejected', updated_at=datetime('now') WHERE id=?`
  ).bind(id).run();

  await c.env.DB.prepare(`
    INSERT INTO approvals (id, po_id, action, actor_id, actor_name, comment)
    VALUES (?, ?, 'rejected', ?, ?, ?)`
  ).bind(genId('appr'), id, user.sub, user.name, comment).run();

  const po = await c.env.DB.prepare('SELECT * FROM purchase_orders WHERE id=?').bind(id).first<any>();
  if (po) {
    const buyer = await c.env.DB.prepare('SELECT email FROM users WHERE id=?').bind(po.requested_by).first<{email:string}>();
    if (buyer) {
      const { subject, html } = poRejectedEmail(po.po_number, po.requested_by_name, comment);
      await sendEmail({ to: buyer.email, subject, html, apiKey: c.env.RESEND_API_KEY });
    }
  }
  return c.json({ success: true, status: 'rejected' });
});

// POST /api/pos/:id/close
pos.post('/:id/close', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare(
    `UPDATE purchase_orders SET status='closed', updated_at=datetime('now') WHERE id=? AND status='ordered'`
  ).bind(id).run();
  return c.json({ success: true });
});

// DELETE /api/pos/:id (draft only)
pos.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const po = await c.env.DB.prepare('SELECT status FROM purchase_orders WHERE id=?').bind(id).first<any>();
  if (!po) return c.json({ error: 'Not found' }, 404);
  if (po.status !== 'draft') return c.json({ error: 'Only draft POs can be deleted' }, 400);
  await c.env.DB.prepare('DELETE FROM purchase_orders WHERE id=?').bind(id).run();
  return c.json({ success: true });
});

export default pos;
