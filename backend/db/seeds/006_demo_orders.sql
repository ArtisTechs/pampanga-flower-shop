-- DEMO orders for local development (feeds the admin dashboard, orders and reports pages).
-- Times are UTC (Philippine time minus 8 hours). INSERT IGNORE with fixed ids, so re-seeding never duplicates.

INSERT IGNORE INTO orders (id, user_id, customer_name, contact_number, bouquet_size, pickup_at, total_php, status, created_at) VALUES
  ('00000000-0000-4000-9000-000000001001', '00000000-0000-4000-8000-000000000101', 'Maria Santos', '0917 555 0124', 'Medium', '2026-03-11 03:15:00', 720, 'Pending', '2026-03-09 02:10:00'),
  ('00000000-0000-4000-9000-000000001002', '00000000-0000-4000-8000-000000000102', 'Juan Dela Cruz', '0918 555 0188', 'Large', '2026-03-10 01:30:00', 1950, 'Pending', '2026-03-08 05:45:00'),
  ('00000000-0000-4000-9000-000000001003', '00000000-0000-4000-8000-000000000103', 'Ralph Manalang', '0920 555 0166', 'Small', '2026-03-07 00:00:00', 550, 'Completed', '2026-03-05 09:20:00'),
  ('00000000-0000-4000-9000-000000001004', NULL, 'Arvil Lavigne', '09917203092', 'Small', '2026-03-12 06:30:00', 720, 'Pending', '2026-03-04 03:00:00'),
  ('00000000-0000-4000-9000-000000001005', '00000000-0000-4000-8000-000000000105', 'Ralph Diaz', '099198111391', 'Medium', '2026-03-12 06:30:00', 1000, 'Completed', '2026-03-03 07:30:00'),
  ('00000000-0000-4000-9000-000000001006', '00000000-0000-4000-8000-000000000106', 'Liana Paule', '09678543321', 'Large', '2026-03-12 06:30:00', 1500, 'Pending', '2026-03-02 01:15:00'),
  ('00000000-0000-4000-9000-000000001007', NULL, 'Zaid Roque', '08768685422', 'Extra Large', '2026-03-12 06:30:00', 2000, 'Ready', '2026-03-01 04:40:00');

INSERT IGNORE INTO order_items (id, order_id, product_id, product_name, unit_price_php, quantity, customization) VALUES
  (1001, '00000000-0000-4000-9000-000000001001', NULL, 'Custom Medium Bouquet - Blush, Korean Style, Satin Ribbon (Roses x3, Peonies x2)', 720, 1,
    '{"size": "Medium", "palette": "Blush", "wrap": "Korean Style", "ribbon": "Satin Ribbon"}'),
  (1002, '00000000-0000-4000-9000-000000001002', NULL, 'Custom Large Bouquet - Red, Kraft Paper, Velvet Ribbon (Roses x5)', 1950, 1,
    '{"size": "Large", "palette": "Red", "wrap": "Kraft Paper", "ribbon": "Velvet Ribbon"}'),
  (1003, '00000000-0000-4000-9000-000000001003', NULL, 'Custom Small Bouquet - Blush, Transparent, Satin Ribbon (Tulips x2)', 550, 1,
    '{"size": "Small", "palette": "Blush", "wrap": "Transparent", "ribbon": "Satin Ribbon"}'),
  (1004, '00000000-0000-4000-9000-000000001004', NULL, 'Custom Small Bouquet - Orange, Kraft Paper, Twine (Sunflowers x2, Daisies x1)', 720, 1,
    '{"size": "Small", "palette": "Orange", "wrap": "Kraft Paper", "ribbon": "Twine"}'),
  (1005, '00000000-0000-4000-9000-000000001005', NULL, 'Custom Medium Bouquet - Blush, Korean Style, Velvet Ribbon (Roses x2, Tulips x2)', 1000, 1,
    '{"size": "Medium", "palette": "Blush", "wrap": "Korean Style", "ribbon": "Velvet Ribbon"}'),
  (1006, '00000000-0000-4000-9000-000000001006', NULL, 'Custom Large Bouquet - Purple, Transparent, Velvet Ribbon (Peonies x3, Roses x2)', 1500, 1,
    '{"size": "Large", "palette": "Purple", "wrap": "Transparent", "ribbon": "Velvet Ribbon"}'),
  (1007, '00000000-0000-4000-9000-000000001007', NULL, 'Custom Extra Large Bouquet - Orange, Kraft Paper, Twine (Sunflowers x3, Roses x2)', 2000, 1,
    '{"size": "Extra Large", "palette": "Orange", "wrap": "Kraft Paper", "ribbon": "Twine"}');

INSERT IGNORE INTO order_item_flowers (order_item_id, flower_code, flower_name, quantity) VALUES
  (1001, 'roses', 'Roses', 3), (1001, 'peonies', 'Peonies', 2),
  (1002, 'roses', 'Roses', 5),
  (1003, 'tulips', 'Tulips', 2),
  (1004, 'sunflowers', 'Sunflowers', 2), (1004, 'daisies', 'Daisies', 1),
  (1005, 'roses', 'Roses', 2), (1005, 'tulips', 'Tulips', 2),
  (1006, 'peonies', 'Peonies', 3), (1006, 'roses', 'Roses', 2),
  (1007, 'sunflowers', 'Sunflowers', 3), (1007, 'roses', 'Roses', 2);
