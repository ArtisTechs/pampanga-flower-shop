-- Bouquet builder refresh: new flower, palette and wrap line-up (Korean and Round wraps only), filler flowers as their own option group, and a cache
-- of AI-generated (Gemini) preview images so each exact selection is generated only once.

ALTER TABLE builder_options
  MODIFY COLUMN option_group ENUM('size', 'flower', 'filler', 'palette', 'wrap', 'ribbon') NOT NULL;

-- Retired options. Orders keep their own copies of option names, so nothing else references these rows.
DELETE FROM builder_options
WHERE id IN (
  'flower-tulips', 'flower-daisies', 'flower-peonies', 'palette-burgundy', 'palette-orange',
  'wrap-kraft', 'wrap-mesh', 'wrap-transparent'
);

-- New options (also in seeds/003_bouquet_builder.sql for fresh databases; INSERT IGNORE keeps both in step).
INSERT IGNORE INTO builder_options (id, option_group, code, name, description, price_php, colors, sort_order) VALUES
  ('flower-carnations', 'flower', 'carnations', 'Carnations', 'Ruffled, long-lasting blooms that stand for admiration and affection.', 40, '["#f27a9b"]', 2),
  ('flower-stargazer-lilies', 'flower', 'stargazer-lilies', 'Stargazer Lilies', 'Large, fragrant star-shaped lilies that make a striking centerpiece.', 40, '["#e0457b"]', 3),
  ('flower-gerberas', 'flower', 'gerberas', 'Gerberas', 'Bright, daisy-like blooms that bring cheer to any bouquet.', 40, '["#ff7a3d"]', 4),
  ('filler-asters', 'filler', 'asters', 'Asters', 'Small star-shaped blooms that add texture and soft color.', 30, '["#9b7fd4"]', 1),
  ('filler-yucca', 'filler', 'yucca', 'Yucca', 'Sword-like green leaves that add height and structure.', 30, '["#4f8a3c"]', 2),
  ('filler-babys-breath', 'filler', 'babys-breath', 'Baby''s Breath', 'Clouds of tiny white flowers for a light, airy finish.', 30, '["#f7f5ef"]', 3),
  ('filler-goldenrod', 'filler', 'goldenrod', 'Goldenrod', 'Feathery golden sprays that brighten the arrangement.', 30, '["#e2b52c"]', 4),
  ('filler-assorted-mums', 'filler', 'assorted-mums', 'Assorted Mums', 'Small mixed chrysanthemums that fill out the bouquet.', 30, '["#f2d64b", "#f7f2e8", "#c77dc7"]', 5),
  ('palette-blue', 'palette', 'blue', 'Blue', 'Cool, calming blues for a fresh and unexpected bouquet.', 0, '["#1f4fa8", "#3d7ad6", "#9cc1ef"]', 5),
  ('palette-black', 'palette', 'black', 'Black', 'Dramatic dark tones for a bold, modern statement.', 0, '["#141414", "#3a2a30", "#5c3a44"]', 6),
  ('wrap-round', 'wrap', 'round', 'Round Wrap', 'Dome-shaped wrap that frames the blooms in a full, rounded bouquet.', 0, NULL, 2);

UPDATE builder_options SET sort_order = 5 WHERE id = 'flower-sunflowers';
UPDATE builder_options SET sort_order = 1 WHERE id = 'wrap-korean';
-- Korean is the only wrap left from before, so it becomes the starting choice if the default was retired.
UPDATE builder_options SET is_default = TRUE, is_available = TRUE WHERE id = 'wrap-korean'
  AND NOT EXISTS (SELECT 1 FROM (SELECT id FROM builder_options WHERE option_group = 'wrap' AND is_default = TRUE) AS wrap_default);

-- selection_key is the SHA-1 of the canonical selection (flowers with counts, fillers, palette, wrap, ribbon);
-- selection keeps the readable option names for the admin gallery.
CREATE TABLE builder_generated_previews (
  selection_key CHAR(40)     NOT NULL,
  selection     JSON         NOT NULL,
  image_url     VARCHAR(500) NOT NULL,
  created_by    CHAR(36)     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (selection_key),
  KEY idx_builder_generated_previews_created (created_at)
);

-- The preview image a custom bouquet was ordered with (NULL for catalog products).
ALTER TABLE order_items
  ADD COLUMN preview_image_url VARCHAR(500) NULL AFTER customization;
