import { Hono } from 'hono';
import { Env } from '../types';
import { genId } from '../lib/helpers';

const suppliers = new Hono<{ Bindings: Env }>();

// GET /api/suppliers
suppliers.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT s.*, 
       (SELECT COUNT(*) FROM purchase_orders po WHERE po.supplier_id = s.id) as po_count,
       (SELECT COALESCE(SUM(grand_total),0) FROM purchase_orders po WHERE po.supplier_id = s.id AND po.status != 'rejected') as total_spend
     FROM suppliers s ORDER BY s.name`
  ).all();
  return c.json({ suppliers: results });
});

// GET /api/suppliers/:id
suppliers.get('/:id', async (c) => {
  const supplier = await c.env.DB.prepare(
    'SELECT * FROM suppliers WHERE id = ?'
  ).bind(c.req.param('id')).first();
  if (!supplier) return c.json({ error: 'Not found' }, 404);
  return c.json({ supplier });
});

// POST /api/suppliers
suppliers.post('/', async (c) => {
  const body = await c.req.json();
  const { name, address, tax_id, contact, phone, email } = body;
  if (!name) return c.json({ error: 'Supplier name required' }, 400);

  const id = genId('sup');
  await c.env.DB.prepare(
    `INSERT INTO suppliers (id, name, address, tax_id, contact, phone, email)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, name, address, tax_id, contact, phone, email).run();

  const supplier = await c.env.DB.prepare('SELECT * FROM suppliers WHERE id = ?').bind(id).first();
  return c.json({ supplier }, 201);
});

// PATCH /api/suppliers/:id
suppliers.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const fields = ['name', 'address', 'tax_id', 'contact', 'phone', 'email', 'is_active'];
  const updates = fields.filter(f => f in body);
  if (updates.length === 0) return c.json({ error: 'No fields to update' }, 400);

  const setClause = updates.map(f => `${f} = ?`).join(', ');
  const values = updates.map(f => body[f]);
  await c.env.DB.prepare(
    `UPDATE suppliers SET ${setClause}, updated_at = datetime('now') WHERE id = ?`
  ).bind(...values, id).run();

  const supplier = await c.env.DB.prepare('SELECT * FROM suppliers WHERE id = ?').bind(id).first();
  return c.json({ supplier });
});

// DELETE /api/suppliers/:id (soft delete)
suppliers.delete('/:id', async (c) => {
  await c.env.DB.prepare(
    `UPDATE suppliers SET is_active = 0, updated_at = datetime('now') WHERE id = ?`
  ).bind(c.req.param('id')).run();
  return c.json({ success: true });
});

export default suppliers;
