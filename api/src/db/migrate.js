import 'dotenv/config';
import { query } from './client.js';

const schema = `
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Suppliers / Vendors
CREATE TABLE IF NOT EXISTS suppliers (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  address     TEXT,
  tax_id      TEXT,
  contact     TEXT,
  phone       TEXT,
  email       TEXT,
  is_active   INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Quotations
CREATE TABLE IF NOT EXISTS quotations (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  quotation_no    TEXT NOT NULL,
  supplier_id     TEXT NOT NULL REFERENCES suppliers(id),
  quote_date      DATE,
  valid_days      INTEGER DEFAULT 14,
  delivery_days   INTEGER DEFAULT 45,
  contact_person  TEXT,
  subtotal        NUMERIC(15,2) DEFAULT 0,
  vat_pct         NUMERIC(5,2) DEFAULT 7,
  vat_amount      NUMERIC(15,2) DEFAULT 0,
  grand_total     NUMERIC(15,2) DEFAULT 0,
  pdf_path        TEXT,
  status          TEXT DEFAULT 'pending',
  notes           TEXT,
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Quotation line items
CREATE TABLE IF NOT EXISTS quotation_items (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  quotation_id    TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  item_no         INTEGER NOT NULL,
  description     TEXT NOT NULL,
  quantity        NUMERIC(10,2) DEFAULT 1,
  unit            TEXT DEFAULT 'EA',
  unit_price      NUMERIC(15,2) DEFAULT 0,
  amount          NUMERIC(15,2) DEFAULT 0
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  po_number         TEXT UNIQUE NOT NULL,
  quotation_id      TEXT REFERENCES quotations(id),
  supplier_id       TEXT NOT NULL REFERENCES suppliers(id),
  status            TEXT DEFAULT 'draft',
  requested_by      TEXT NOT NULL,
  requested_by_name TEXT,
  approved_by       TEXT,
  approved_by_name  TEXT,
  approved_at       TIMESTAMPTZ,
  order_date        DATE DEFAULT CURRENT_DATE,
  delivery_date     DATE,
  shipping_address  TEXT,
  subtotal          NUMERIC(15,2) DEFAULT 0,
  vat_pct           NUMERIC(5,2) DEFAULT 7,
  vat_amount        NUMERIC(15,2) DEFAULT 0,
  grand_total       NUMERIC(15,2) DEFAULT 0,
  notes             TEXT,
  po_pdf_path       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- PO line items
CREATE TABLE IF NOT EXISTS po_items (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  po_id           TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_no         INTEGER NOT NULL,
  description     TEXT NOT NULL,
  quantity        NUMERIC(10,2) DEFAULT 1,
  unit            TEXT DEFAULT 'EA',
  unit_price      NUMERIC(15,2) DEFAULT 0,
  amount          NUMERIC(15,2) DEFAULT 0
);

-- Approval audit trail
CREATE TABLE IF NOT EXISTS approvals (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  po_id       TEXT NOT NULL REFERENCES purchase_orders(id),
  action      TEXT NOT NULL,
  actor_id    TEXT,
  actor_name  TEXT,
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT DEFAULT 'buyer',
  password_hash TEXT,
  is_active     INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_po_status     ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_supplier   ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_created    ON purchase_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_quot_supplier ON quotations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_approvals_po  ON approvals(po_id);
`;

async function migrate() {
  console.log('Running database migrations...');
  try {
    const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await query(stmt);
    }
    console.log('✓ Migrations complete');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
