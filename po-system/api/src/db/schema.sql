-- =============================================
-- PO System Database Schema
-- Cloudflare D1 (SQLite-compatible)
-- =============================================

PRAGMA foreign_keys = ON;

-- Suppliers / Vendors
CREATE TABLE IF NOT EXISTS suppliers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  address     TEXT,
  tax_id      TEXT,
  contact     TEXT,
  phone       TEXT,
  email       TEXT,
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- Quotations (received from suppliers)
CREATE TABLE IF NOT EXISTS quotations (
  id              TEXT PRIMARY KEY,
  quotation_no    TEXT NOT NULL,
  supplier_id     TEXT NOT NULL REFERENCES suppliers(id),
  quote_date      TEXT,
  valid_days      INTEGER DEFAULT 14,
  delivery_days   INTEGER DEFAULT 45,
  contact_person  TEXT,
  subtotal        REAL DEFAULT 0,
  vat_pct         REAL DEFAULT 7,
  vat_amount      REAL DEFAULT 0,
  grand_total     REAL DEFAULT 0,
  pdf_key         TEXT,
  status          TEXT DEFAULT 'pending',
  notes           TEXT,
  created_by      TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- Quotation line items
CREATE TABLE IF NOT EXISTS quotation_items (
  id              TEXT PRIMARY KEY,
  quotation_id    TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  item_no         INTEGER NOT NULL,
  description     TEXT NOT NULL,
  quantity        REAL DEFAULT 1,
  unit            TEXT DEFAULT 'EA',
  unit_price      REAL DEFAULT 0,
  amount          REAL DEFAULT 0
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id                TEXT PRIMARY KEY,
  po_number         TEXT UNIQUE NOT NULL,
  quotation_id      TEXT REFERENCES quotations(id),
  supplier_id       TEXT NOT NULL REFERENCES suppliers(id),
  status            TEXT DEFAULT 'draft',
  requested_by      TEXT NOT NULL,
  requested_by_name TEXT,
  approved_by       TEXT,
  approved_by_name  TEXT,
  approved_at       TEXT,
  order_date        TEXT DEFAULT (date('now')),
  delivery_date     TEXT,
  shipping_address  TEXT,
  subtotal          REAL DEFAULT 0,
  vat_pct           REAL DEFAULT 7,
  vat_amount        REAL DEFAULT 0,
  grand_total       REAL DEFAULT 0,
  notes             TEXT,
  po_pdf_key        TEXT,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- PO line items
CREATE TABLE IF NOT EXISTS po_items (
  id              TEXT PRIMARY KEY,
  po_id           TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_no         INTEGER NOT NULL,
  description     TEXT NOT NULL,
  quantity        REAL DEFAULT 1,
  unit            TEXT DEFAULT 'EA',
  unit_price      REAL DEFAULT 0,
  amount          REAL DEFAULT 0
);

-- Approval / audit trail
CREATE TABLE IF NOT EXISTS approvals (
  id          TEXT PRIMARY KEY,
  po_id       TEXT NOT NULL REFERENCES purchase_orders(id),
  action      TEXT NOT NULL,
  actor_id    TEXT,
  actor_name  TEXT,
  comment     TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Users (basic local auth, or sync from Clerk)
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT DEFAULT 'buyer',
  password_hash TEXT,
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_po_status       ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_supplier     ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_created      ON purchase_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_quot_supplier   ON quotations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_approvals_po    ON approvals(po_id);
