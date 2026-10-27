-- Starting inventory for flowers and add-ons.
-- INSERT IGNORE: only adds missing rows, so stock adjusted in the admin panel is kept on re-seed.

INSERT IGNORE INTO inventory_items (id, kind, name, description, current_stock, threshold, capacity, unit, sort_order) VALUES
  ('rose', 'flower', 'Roses', 'Classic and romantic flowers that symbolize love and elegance.', 80, 20, 100, 'stems', 1),
  ('tulip', 'flower', 'Tulips', 'Simple and graceful blooms that represent happiness and fresh beginnings.', 64, 20, 100, 'stems', 2),
  ('sunflower', 'flower', 'Sunflowers', 'Bright and cheerful flowers that bring warmth and positivity.', 42, 30, 100, 'stems', 3),
  ('daisy', 'flower', 'Daisies', 'Light and charming blooms that symbolize innocence and joy.', 28, 20, 100, 'stems', 4),
  ('peony', 'flower', 'Peonies', 'Soft and luxurious flowers known for their full petals and timeless beauty.', 16, 20, 100, 'stems', 5),
  ('kraft-wrap', 'add-on', 'Kraft Wrap', 'Rustic kraft wrapping sheets for natural bouquet styling.', 54, 15, 80, 'sheets', 1),
  ('mesh-wrap', 'add-on', 'Mesh Wrap', 'Textured mesh wraps for layered presentation.', 12, 10, 60, 'sheets', 2),
  ('satin-ribbon', 'add-on', 'Satin Ribbon', 'Smooth satin ribbon rolls used for elegant finishing.', 18, 8, 40, 'rolls', 3),
  ('gift-card', 'add-on', 'Gift Cards', 'Printed mini message cards included with custom bouquets.', 120, 20, 150, 'pieces', 4);

-- Stock behind the customizer's flowers and fillers (also in migration 010). Roses and Sunflowers reuse the
-- rows above; every other option gets its own row. Only fills what's missing.
UPDATE inventory_items SET builder_option_id = 'flower-roses' WHERE id = 'rose' AND builder_option_id IS NULL;
UPDATE inventory_items SET builder_option_id = 'flower-sunflowers' WHERE id = 'sunflower' AND builder_option_id IS NULL;
INSERT INTO inventory_items (id, kind, builder_option_id, name, description, current_stock, threshold, capacity, unit, sort_order)
SELECT b.id, 'flower', b.id, b.name, b.description, 50, 15, 100, IF(b.option_group = 'filler', 'bunches', 'stems'), 100 + b.sort_order
FROM builder_options b
WHERE b.option_group IN ('flower', 'filler')
  AND NOT EXISTS (SELECT 1 FROM inventory_items i WHERE i.builder_option_id = b.id OR i.id = b.id);
