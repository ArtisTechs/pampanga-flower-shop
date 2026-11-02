-- Real photos of ready-made customizer combinations, shown instead of an AI-generated preview. The photos cover
-- Korean wrap with a satin ribbon; every other wrap or ribbon still gets a generated preview.

-- Fillers the photos use (also in seeds/003_bouquet_builder.sql for fresh databases; INSERT IGNORE keeps both in step).
INSERT IGNORE INTO builder_options (id, option_group, code, name, description, price_php, colors, sort_order) VALUES
  ('filler-eucalyptus', 'filler', 'eucalyptus', 'Eucalyptus', 'Soft silvery-green leaves that add a fresh, natural touch.', 30, '["#8fae9a"]', 6),
  ('filler-statice-white', 'filler', 'statice-white', 'Statice White', 'Papery white sprays that give a delicate, textured finish.', 30, '["#f4f1ea"]', 7);

-- The new fillers draw from their own inventory rows, like every other filler (see 010_order_stock).
INSERT INTO inventory_items (id, kind, builder_option_id, name, description, current_stock, threshold, capacity, unit, sort_order)
SELECT b.id, 'flower', b.id, b.name, b.description, 50, 15, 100, 'bunches', 100 + b.sort_order
FROM builder_options b
WHERE b.id IN ('filler-eucalyptus', 'filler-statice-white')
  AND NOT EXISTS (SELECT 1 FROM inventory_items i WHERE i.builder_option_id = b.id OR i.id = b.id);

-- combination_key is the SHA-1 of the canonical flowers (code:color:quantity), fillers and palette, with wrap and
-- ribbon implied (Korean, satin). selection keeps the readable names for the admin; source_path is the photo's
-- original folder and file, so a re-run of the import can skip what is already uploaded.
CREATE TABLE builder_combination_photos (
  combination_key CHAR(40)     NOT NULL,
  selection       JSON         NOT NULL,
  image_url       VARCHAR(500) NOT NULL,
  source_path     VARCHAR(500) NOT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (combination_key)
);
