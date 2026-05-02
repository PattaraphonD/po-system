import { Hono } from 'hono';
import { query, queryOne } from '../db/client.js';
import { calcVAT } from '../lib/helpers.js';

const quotations = new Hono();

// GET /api/quotations
quotations.get('/', async (c) => {
  const { status, supplier_id } = c.req.query();
  const conditions = ['1=1'];
  const vals = [];
  if (status)      { vals.push(status);      conditions.push(`q.status = $${vals.length}`); }
  if (supplier_id) { vals.push(supplier_id); conditions.push(`q.supplier_id = $${vals.length}`); }

  const rows = await query(`
    SELECT q.*, s.name AS supplier_name
    FROM quotations q
    LEFT JOIN suppliers s ON s.id = q.supplier_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY q.created_at DESC
  `, vals);
  return c.json({ quotations: rows });
});

// GET /api/quotations/:id
quotations.get('/:id', async (c) => {
  const id = c.req.param('id');
  const q = await queryOne(`
    SELECT q.*, s.name AS supplier_name, s.address AS supplier_address,
           s.phone AS supplier_phone, s.email AS supplier_email,
           s.contact AS supplier_contact
    FROM quotations q
    LEFT JOIN suppliers s ON s.id = q.supplier_id
    WHERE q.id = $1
  `, [id]);
  if (!q) return c.json({ error: 'Not found' }, 404);

  const items = await query(
    'SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY item_no',
    [id]
  );
  return c.json({ quotation: { ...q, items } });
});

// POST /api/quotations
quotations.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { supplier_id, quotation_no, quote_date, valid_days = 14,
          delivery_days = 45, contact_person, notes, items = [] } = body;

  if (!supplier_id || !quotation_no)
    return c.json({ error: 'supplier_id and quotation_no required' }, 400);

  const subtotal = items.reduce((s, i) => s + Number(i.amount || i.quantity * i.unit_price || 0), 0);
  const { vat_amount, grand_total } = calcVAT(subtotal);

  const rows = await query(`
    INSERT INTO quotations (quotation_no, supplier_id, quote_date, valid_days,
      delivery_days, contact_person, subtotal, vat_amount, grand_total, notes, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
  `, [quotation_no, supplier_id, quote_date || null, valid_days,
      delivery_days, contact_person, subtotal, vat_amount, grand_total,
      notes, user?.sub || 'system']);
  const quot = rows[0];

  for (const item of items) {
    const amount = Number(item.amount ?? item.quantity * item.unit_price);
    await query(`
      INSERT INTO quotation_items (quotation_id, item_no, description, quantity, unit, unit_price, amount)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [quot.id, item.item_no, item.description, item.quantity, item.unit || 'EA', item.unit_price, amount]);
  }

  const savedItems = await query(
    'SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY item_no', [quot.id]
  );
  return c.json({ quotation: { ...quot, items: savedItems } }, 201);
});

// PATCH /api/quotations/:id
quotations.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const allowed = ['quotation_no','quote_date','valid_days','delivery_days','contact_person','notes','status'];
  const updates = allowed.filter(f => f in body);
  if (!updates.length) return c.json({ error: 'No valid fields' }, 400);

  const set = updates.map((f, i) => `${f} = $${i + 1}`).join(', ');
  await query(
    `UPDATE quotations SET ${set}, updated_at = NOW() WHERE id = $${updates.length + 1}`,
    [...updates.map(f => body[f]), id]
  );
  return c.json({ success: true });
});

// DELETE /api/quotations/:id
quotations.delete('/:id', async (c) => {
  await query('DELETE FROM quotations WHERE id = $1', [c.req.param('id')]);
  return c.json({ success: true });
});

export default quotations;
