import { Hono } from 'hono';
import { query, queryOne } from '../db/client.js';

const suppliers = new Hono();

// GET /api/suppliers
suppliers.get('/', async (c) => {
  const rows = await query(`
    SELECT s.*,
      COUNT(po.id)::int                                   AS po_count,
      COALESCE(SUM(CASE WHEN po.status != 'rejected' THEN po.grand_total END), 0)::float AS total_spend
    FROM suppliers s
    LEFT JOIN purchase_orders po ON po.supplier_id = s.id
    GROUP BY s.id
    ORDER BY s.name
  `);
  return c.json({ suppliers: rows });
});

// GET /api/suppliers/:id
suppliers.get('/:id', async (c) => {
  const s = await queryOne('SELECT * FROM suppliers WHERE id = $1', [c.req.param('id')]);
  if (!s) return c.json({ error: 'Not found' }, 404);
  return c.json({ supplier: s });
});

// POST /api/suppliers
suppliers.post('/', async (c) => {
  const { name, address, tax_id, contact, phone, email } = await c.req.json();
  if (!name) return c.json({ error: 'Supplier name required' }, 400);
  const rows = await query(
    'INSERT INTO suppliers (name,address,tax_id,contact,phone,email) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [name, address, tax_id, contact, phone, email]
  );
  return c.json({ supplier: rows[0] }, 201);
});

// PATCH /api/suppliers/:id
suppliers.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const allowed = ['name','address','tax_id','contact','phone','email','is_active'];
  const updates = allowed.filter(f => f in body);
  if (!updates.length) return c.json({ error: 'No valid fields' }, 400);

  const set = updates.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const vals = [...updates.map(f => body[f]), id];
  await query(
    `UPDATE suppliers SET ${set}, updated_at = NOW() WHERE id = $${vals.length}`,
    vals
  );
  const s = await queryOne('SELECT * FROM suppliers WHERE id = $1', [id]);
  return c.json({ supplier: s });
});

// DELETE /api/suppliers/:id (soft delete)
suppliers.delete('/:id', async (c) => {
  await query('UPDATE suppliers SET is_active = 0, updated_at = NOW() WHERE id = $1', [c.req.param('id')]);
  return c.json({ success: true });
});

export default suppliers;
