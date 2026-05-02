-- =============================================
-- Seed Data — based on uploaded quotations
-- =============================================

-- Seed users
INSERT OR IGNORE INTO users (id, email, name, role, password_hash) VALUES
  ('usr_admin',   'admin@microchip.co.th',    'Admin',         'admin',    '$2a$10$placeholder'),
  ('usr_buyer1',  'waraporn@microchip.co.th', 'K. Waraporn M', 'buyer',    '$2a$10$placeholder'),
  ('usr_buyer2',  'chutharat@microchip.co.th','K. Chutharat F','buyer',    '$2a$10$placeholder'),
  ('usr_approver','manager@microchip.co.th',  'Manager',       'approver', '$2a$10$placeholder');

-- Seed supplier (Pattarapol General Part from your PDFs)
INSERT OR IGNORE INTO suppliers (id, name, address, phone, email, contact) VALUES
  ('sup_001', 'PATTARAPOL GENERAL PART LIMITED PARTNERSHIP',
   '246 ซ.รังสิต-นครนายก 64 ต.ประชาธิปัตย์ อ.ธัญบุรี จ.ปทุมธานี 12130',
   '02-991-6908', 'Chiradate_8@hotmail.com', 'จิรเดช เดโช');

-- Quotation 26/007 (Silicone / Dowsil)
INSERT OR IGNORE INTO quotations (id, quotation_no, supplier_id, quote_date, valid_days, delivery_days,
  contact_person, subtotal, vat_pct, vat_amount, grand_total, status, created_by) VALUES
  ('quot_007', '26/007', 'sup_001', '2026-01-21', 14, 45,
   'K.WARAPORN M', 3900.00, 7, 273.00, 4173.00, 'pending', 'usr_buyer1');

INSERT OR IGNORE INTO quotation_items (id, quotation_id, item_no, description, quantity, unit, unit_price, amount) VALUES
  ('qi_007_1', 'quot_007', 1, 'Dow DOWSIL™ 736 RTV Heat Resistant Sealant Silicone Red 300 mL Tube', 4, 'Tube', 975.00, 3900.00);

-- Quotation 26/004 (Batteries / ถ่านอัลคาไลน์)
INSERT OR IGNORE INTO quotations (id, quotation_no, supplier_id, quote_date, valid_days, delivery_days,
  contact_person, subtotal, vat_pct, vat_amount, grand_total, status, created_by) VALUES
  ('quot_004', '26/004', 'sup_001', '2026-01-08', 14, 45,
   'K.Chutharat F', 17160.00, 7, 1201.20, 18361.20, 'pending', 'usr_buyer2');

INSERT OR IGNORE INTO quotation_items (id, quotation_id, item_no, description, quantity, unit, unit_price, amount) VALUES
  ('qi_004_1',  'quot_004', 1,  'ถ่านอัลคาไลน์ PANASONIC 6LR61T/1B 9V',                           24, 'Pack', 80.00,  1920.00),
  ('qi_004_2',  'quot_004', 2,  'ถ่านอัลคาไลน์ PANASONIC LR6T/8B AA (แพ็ค 8 ก้อน)',              24, 'Pack', 200.00, 4800.00),
  ('qi_004_3',  'quot_004', 3,  'ถ่านอัลคาไลน์ PANASONIC LR03T/4B AAA (แพ็ค 4 ก้อน)',            24, 'Pack', 115.00, 2760.00),
  ('qi_004_4',  'quot_004', 4,  'ถ่านอัลคาไลน์ PANASONIC LR20T/2B D',                             24, 'Pack', 100.00, 2400.00),
  ('qi_004_5',  'quot_004', 5,  'ถ่านไฟฉาย Panasonic GOLD ขนาด D (2 ก้อน/แพ็ค)',                  6, 'Pack', 50.00,  300.00),
  ('qi_004_6',  'quot_004', 6,  'ถ่านไฟฉาย Panasonic GOLD ขนาด AA (4 ก้อน/แพ็ค)',                12, 'Pack', 45.00,  540.00),
  ('qi_004_7',  'quot_004', 7,  'ถ่านไฟฉาย Panasonic GOLD ขนาด AAA (4 ก้อน/แพ็ค)',               12, 'Pack', 50.00,  600.00),
  ('qi_004_8',  'quot_004', 8,  'ถ่านกระดุม Panasonic CR2430',                                    24, 'Piece',45.00,  1080.00),
  ('qi_004_9',  'quot_004', 9,  'ถ่านกระดุม Panasonic CR2032',                                    24, 'Piece',55.00,  1320.00),
  ('qi_004_10', 'quot_004', 10, 'ถ่านกระดุม Panasonic CR2025',                                    12, 'Piece',60.00,  720.00),
  ('qi_004_11', 'quot_004', 11, 'ถ่านกระดุม Panasonic CR2016',                                    12, 'Piece',60.00,  720.00);
