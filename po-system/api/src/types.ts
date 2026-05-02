export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  KV: KVNamespace;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  ENVIRONMENT: string;
}

export type POStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'ordered'
  | 'closed'
  | 'rejected';

export type UserRole = 'admin' | 'approver' | 'buyer' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Supplier {
  id: string;
  name: string;
  address?: string;
  tax_id?: string;
  contact?: string;
  phone?: string;
  email?: string;
  is_active: number;
  created_at: string;
}

export interface Quotation {
  id: string;
  quotation_no: string;
  supplier_id: string;
  supplier_name?: string;
  quote_date?: string;
  valid_days: number;
  delivery_days: number;
  contact_person?: string;
  subtotal: number;
  vat_pct: number;
  vat_amount: number;
  grand_total: number;
  pdf_key?: string;
  status: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  items?: QuotationItem[];
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  item_no: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  quotation_id?: string;
  supplier_id: string;
  supplier_name?: string;
  status: POStatus;
  requested_by: string;
  requested_by_name?: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  order_date: string;
  delivery_date?: string;
  shipping_address?: string;
  subtotal: number;
  vat_pct: number;
  vat_amount: number;
  grand_total: number;
  notes?: string;
  po_pdf_key?: string;
  created_at: string;
  updated_at: string;
  items?: POItem[];
  approvals?: Approval[];
}

export interface POItem {
  id: string;
  po_id: string;
  item_no: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

export interface Approval {
  id: string;
  po_id: string;
  action: string;
  actor_id?: string;
  actor_name?: string;
  comment?: string;
  created_at: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  iat: number;
  exp: number;
}
