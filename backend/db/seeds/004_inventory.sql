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
