ALTER TABLE order_items DROP COLUMN preview_image_url;

DROP TABLE builder_generated_previews;

DELETE FROM builder_options
WHERE option_group = 'filler'
   OR id IN ('flower-carnations', 'flower-stargazer-lilies', 'flower-gerberas', 'palette-blue', 'palette-black', 'wrap-round');

ALTER TABLE builder_options
  MODIFY COLUMN option_group ENUM('size', 'flower', 'palette', 'wrap', 'ribbon') NOT NULL;

UPDATE builder_options SET sort_order = 3 WHERE id = 'flower-sunflowers';
UPDATE builder_options SET sort_order = 2 WHERE id = 'wrap-korean';

INSERT IGNORE INTO builder_options (id, option_group, code, name, description, price_php, colors, sort_order) VALUES
  ('flower-tulips', 'flower', 'tulips', 'Tulips', 'Simple and graceful blooms that represent happiness and fresh beginnings.', 40, '["#ff8b84"]', 2),
  ('flower-daisies', 'flower', 'daisies', 'Daisies', 'Light and charming blooms that symbolize innocence and joy.', 40, '["#f1da4f"]', 4),
  ('flower-peonies', 'flower', 'peonies', 'Peonies', 'Soft and luxurious flowers known for their full petals and timeless beauty.', 40, '["#ff9eb6"]', 5),
  ('palette-burgundy', 'palette', 'burgundy', 'Burgundy', 'Deep red tones for dramatic and refined occasions.', 0, '["#7c171d", "#9f2828", "#ce3634"]', 5),
  ('palette-orange', 'palette', 'orange', 'Orange', 'Vibrant sunset colors for bright, joyful celebrations.', 0, '["#d15e00", "#e0781d", "#ff7817"]', 6),
  ('wrap-kraft', 'wrap', 'kraft', 'Kraft Paper', 'A natural wrap style that keeps the bouquet warm and rustic.', 0, NULL, 1),
  ('wrap-mesh', 'wrap', 'mesh', 'Mesh Wrapper', 'Textured mesh wrap for a layered, airy presentation.', 0, NULL, 3),
  ('wrap-transparent', 'wrap', 'transparent', 'Transparent', 'Clear wrapping that lets every bloom show through.', 0, NULL, 4);
