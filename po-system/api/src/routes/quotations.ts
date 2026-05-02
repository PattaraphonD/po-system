import { Hono } from 'hono';
import { Env, JWTPayload } from '../types';
import { genId, calcVAT } from '../lib/helpers';

const quotations = new Hono<{ Bindings: Env }>();

// GET /api/quotations
quotations.get('/', async (c) => {
  const { status, supplier_id } = c.req.query();
  let query = `
    SELECT q.*, s.name as supplier_name
    FROM quotations q
    LEFT JOIN suppliers s ON s.id = q.supplier_id
    WHERE 1=1`;
  const binds: string[] = [];
  if (status) { query += ' AND q.status = ?'; binds.push(status); }
  if (supplier_id) { query += ' AND q.supplier_id = ?'; binds.push(supplier_id); }
  query += ' ORDER BY q.created_at DESC';

  const { results } = await c.env.DB.prepare(query).bind(...binds).all();
  return c.json({ quotations: results });
});

// GET /api/quotations/:id
quotations.get('/:id', async (c) => {
  const id = c.req.param('id');
  const quotation = await c.env.DB.prepare(`
    SELECT q.*, s.name as supplier_name, s.address as supplier_address,
           s.phone as supplier_phone, s.email as supplier_email,
           s.contact as supplier_contact
    FROM quotations q
    LEFT JOIN suppliers s ON s.id = q.supplier_id
    WHERE q.id = ?`).bind(id).first();
  if (!quotation) return c.json({ error: 'Not found' }, 404);

  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY item_no'
  ).bind(id).all();

  return c.json({ quotation: { ...quotation, items } });
});

// POST /api/quotations
quotations.post('/', async (c) => {
  const user = c.get('user') as JWTPayload;
  const body = await c.req.json();
  const { supplier_id, quotation_no, quote_date, valid_days = 14,
          delivery_days = 45, contact_person, notes, items = [] } = body;

  if (!supplier_id || !quotation_no) {
    return c.json({ error: 'supplier_id and quotation_no required' }, 400);
  }

  const subtotal = items.reduce((s: number, i: any) => s + (i.amount || i.quantity * i.unit_price || 0), 0);
  const { vat_amount, grand_total } = calcVAT(subtotal);
  const id = genId('quot');

  await c.env.DB.prepare(`
    INSERT INTO quotations (id, quotation_no, supplier_id, quote_date, valid_days,
      delivery_days, contact_person, subtotal, vat_amount, grand_total, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, quotation_no, supplier_id, quote_date, valid_days,
    delivery_days, contact_person, subtotal, vat_amount, grand_total, notes, user?.sub || 'system'
  ).run();

  // Insert items
  for (const item of items) {
    const amount = item.amount ?? (item.quantity * item.unit_price);
    await c.env.DB.prepare(`
      INSERT INTO quotation_items (id, quotation_id, item_no, description, quantity, unit, unit_price, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(genId('qi'), id, item.item_no, item.description,
      item.quantity, item.unit || 'EA', item.unit_price, amount).run();
  }

  const quotation = await c.env.DB.prepare('SELECT * FROM quotations WHERE id = ?').bind(id).first();
  const { results: savedItems } = await c.env.DB.prepare(
    'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY item_no'
  ).bind(id).all();
  return c.json({ quotation: { ...quotation, items: savedItems } }, 201);
});

// PATCH /api/quotations/:id
quotations.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const allowed = ['quotation_no','quote_date','valid_days','delivery_days',
                   'contact_person','notes','status'];
  const updates = allowed.filter(f => f in body);
  if (updates.length === 0) return c.json({ error: 'No valid fields' }, 400);

  const set = updates.map(f => `${f} = ?`).join(', ');
  await c.env.DB.prepare(
    `UPDATE quotations SET ${set}, updated_at = datetime('now') WHERE id = ?`
  ).bind(...updates.map(f => body[f]), id).run();

  return c.json({ success: true });
});

// DELETE /api/quotations/:id
quotations.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM quotations WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ success: true });
});

export default quotations;
