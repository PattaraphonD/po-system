import { Hono } from 'hono';
import { query, queryOne, transaction } from '../db/client.js';
import { generatePONumber, calcVAT } from '../lib/helpers.js';
import { sendEmail, poSubmittedEmail, poApprovedEmail, poRejectedEmail } from '../lib/email.js';

const pos = new Hono();

// GET /api/pos
pos.get('/', async (c) => {
  const { status, supplier_id, from, to, limit = '50', offset = '0' } = c.req.query();
  const conditions = ['1=1'];
  const vals = [];

  if (status)      { vals.push(status);      conditions.push(`po.status = $${vals.length}`); }
  if (supplier_id) { vals.push(supplier_id); conditions.push(`po.supplier_id = $${vals.length}`); }
  if (from)        { vals.push(from);        conditions.push(`po.order_date >= $${vals.length}`); }
  if (to)          { vals.push(to);          conditions.push(`po.order_date <= $${vals.length}`); }

  vals.push(parseInt(limit)); vals.push(parseInt(offset));
  const rows = await query(`
    SELECT po.*, s.name AS supplier_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id = po.supplier_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY po.created_at DESC
    LIMIT $${vals.length - 1} OFFSET $${vals.length}
  `, vals);

  const countRow = await queryOne('SELECT COUNT(*)::int AS cnt FROM purchase_orders');
  return c.json({ pos: rows, total: countRow?.cnt ?? 0 });
});

// GET /api/pos/:id
pos.get('/:id', async (c) => {
  const id = c.req.param('id');
  const po = await queryOne(`
    SELECT po.*, s.name AS supplier_name, s.address AS supplier_address,
           s.phone AS supplier_phone, s.email AS supplier_email,
           s.contact AS supplier_contact, s.tax_id AS supplier_tax_id
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id = po.supplier_id
    WHERE po.id = $1
  `, [id]);
  if (!po) return c.json({ error: 'Not found' }, 404);

  const items    = await query('SELECT * FROM po_items WHERE po_id = $1 ORDER BY item_no', [id]);
  const approval = await query('SELECT * FROM approvals WHERE po_id = $1 ORDER BY created_at ASC', [id]);
  return c.json({ po: { ...po, items, approvals: approval } });
});

// POST /api/pos — create
pos.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { quotation_id, supplier_id, delivery_date, shipping_address, notes, items = [] } = body;
  if (!supplier_id) return c.json({ error: 'supplier_id required' }, 400);

  let finalItems = items;
  if (quotation_id && items.length === 0) {
    finalItems = await query(
      'SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY item_no', [quotation_id]
    );
  }

  const subtotal = finalItems.reduce((s, i) => s + Number(i.amount), 0);
  const { vat_amount, grand_total } = calcVAT(subtotal);
  const po_number = await generatePONumber();

  const result = await transaction(async (client) => {
    const poRows = await client.query(`
      INSERT INTO purchase_orders
        (po_number, quotation_id, supplier_id, requested_by, requested_by_name,
         delivery_date, shipping_address, subtotal, vat_amount, grand_total, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [po_number, quotation_id || null, supplier_id,
        user.sub, user.name, delivery_date || null, shipping_address || null,
        subtotal, vat_amount, grand_total, notes || null]);
    const po = poRows.rows[0];

    for (const item of finalItems) {
      await client.query(`
        INSERT INTO po_items (po_id, item_no, description, quantity, unit, unit_price, amount)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [po.id, item.item_no, item.description, item.quantity,
          item.unit || 'EA', item.unit_price, item.amount]);
    }

    await client.query(`
      INSERT INTO approvals (po_id, action, actor_id, actor_name, comment)
      VALUES ($1,'created',$2,$3,'PO created')
    `, [po.id, user.sub, user.name]);

    return po;
  });

  return c.json({ po: result }, 201);
});

// PATCH /api/pos/:id
pos.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const po = await queryOne('SELECT status FROM purchase_orders WHERE id = $1', [id]);
  if (!po) return c.json({ error: 'Not found' }, 404);
  if (!['draft', 'rejected'].includes(po.status))
    return c.json({ error: `Cannot edit PO in status: ${po.status}` }, 400);

  const allowed = ['delivery_date', 'shipping_address', 'notes'];
  const updates = allowed.filter(f => f in body);
  if (updates.length) {
    const set = updates.map((f, i) => `${f} = $${i + 1}`).join(', ');
    await query(
      `UPDATE purchase_orders SET ${set}, updated_at = NOW() WHERE id = $${updates.length + 1}`,
      [...updates.map(f => body[f]), id]
    );
  }

  if (body.items?.length) {
    await query('DELETE FROM po_items WHERE po_id = $1', [id]);
    const subtotal = body.items.reduce((s, i) => s + Number(i.amount), 0);
    const { vat_amount, grand_total } = calcVAT(subtotal);
    for (const item of body.items) {
      await query(
        `INSERT INTO po_items (po_id, item_no, description, quantity, unit, unit_price, amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, item.item_no, item.description, item.quantity, item.unit || 'EA', item.unit_price, item.amount]
      );
    }
    await query(
      'UPDATE purchase_orders SET subtotal=$1,vat_amount=$2,grand_total=$3,updated_at=NOW() WHERE id=$4',
      [subtotal, vat_amount, grand_total, id]
    );
  }
  const updated = await queryOne('SELECT * FROM purchase_orders WHERE id=$1', [id]);
  return c.json({ po: updated });
});

// POST /api/pos/:id/submit
pos.post('/:id/submit', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const po = await queryOne('SELECT * FROM purchase_orders WHERE id = $1', [id]);
  if (!po) return c.json({ error: 'Not found' }, 404);
  if (!['draft', 'rejected'].includes(po.status))
    return c.json({ error: `Cannot submit from status: ${po.status}` }, 400);

  await query(`UPDATE purchase_orders SET status='submitted', updated_at=NOW() WHERE id=$1`, [id]);
  await query(
    `INSERT INTO approvals (po_id, action, actor_id, actor_name) VALUES ($1,'submitted',$2,$3)`,
    [id, user.sub, user.name]
  );

  const approvers = await query(
    `SELECT email FROM users WHERE role IN ('approver','admin') AND is_active = 1`
  );
  for (const a of approvers) {
    const { subject, html } = poSubmittedEmail(po.po_number, Number(po.grand_total));
    await sendEmail({ to: a.email, subject, html });
  }
  return c.json({ success: true, status: 'submitted' });
});

// POST /api/pos/:id/approve
pos.post('/:id/approve', async (c) => {
  const user = c.get('user');
  if (!['approver', 'admin'].includes(user.role))
    return c.json({ error: 'Forbidden' }, 403);

  const id = c.req.param('id');
  const { comment = '' } = await c.req.json().catch(() => ({}));
  const po = await queryOne('SELECT * FROM purchase_orders WHERE id = $1', [id]);
  if (!po) return c.json({ error: 'Not found' }, 404);
  if (!['submitted', 'in_review'].includes(po.status))
    return c.json({ error: `Cannot approve from status: ${po.status}` }, 400);

  await query(`
    UPDATE purchase_orders
    SET status='approved', approved_by=$1, approved_by_name=$2, approved_at=NOW(), updated_at=NOW()
    WHERE id=$3
  `, [user.sub, user.name, id]);
  await query(
    `INSERT INTO approvals (po_id, action, actor_id, actor_name, comment) VALUES ($1,'approved',$2,$3,$4)`,
    [id, user.sub, user.name, comment || null]
  );

  const buyer = await queryOne('SELECT email FROM users WHERE id = $1', [po.requested_by]);
  if (buyer) {
    const { subject, html } = poApprovedEmail(po.po_number, po.requested_by_name, Number(po.grand_total));
    await sendEmail({ to: buyer.email, subject, html });
  }
  return c.json({ success: true, status: 'approved' });
});

// POST /api/pos/:id/reject
pos.post('/:id/reject', async (c) => {
  const user = c.get('user');
  if (!['approver', 'admin'].includes(user.role))
    return c.json({ error: 'Forbidden' }, 403);

  const id = c.req.param('id');
  const { comment } = await c.req.json();
  if (!comment) return c.json({ error: 'Rejection reason required' }, 400);

  await query(`UPDATE purchase_orders SET status='rejected', updated_at=NOW() WHERE id=$1`, [id]);
  await query(
    `INSERT INTO approvals (po_id, action, actor_id, actor_name, comment) VALUES ($1,'rejected',$2,$3,$4)`,
    [id, user.sub, user.name, comment]
  );

  const po = await queryOne('SELECT * FROM purchase_orders WHERE id=$1', [id]);
  if (po) {
    const buyer = await queryOne('SELECT email FROM users WHERE id=$1', [po.requested_by]);
    if (buyer) {
      const { subject, html } = poRejectedEmail(po.po_number, po.requested_by_name, comment);
      await sendEmail({ to: buyer.email, subject, html });
    }
  }
  return c.json({ success: true, status: 'rejected' });
});

// POST /api/pos/:id/close
pos.post('/:id/close', async (c) => {
  const id = c.req.param('id');
  await query(
    `UPDATE purchase_orders SET status='closed', updated_at=NOW() WHERE id=$1 AND status='approved'`,
    [id]
  );
  return c.json({ success: true });
});

// DELETE /api/pos/:id — draft only
pos.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const po = await queryOne('SELECT status FROM purchase_orders WHERE id=$1', [id]);
  if (!po) return c.json({ error: 'Not found' }, 404);
  if (po.status !== 'draft') return c.json({ error: 'Only draft POs can be deleted' }, 400);
  await query('DELETE FROM purchase_orders WHERE id=$1', [id]);
  return c.json({ success: true });
});

export default pos;
