-- Editable builder options: each flower gets the colors a customer can pick from (one is the default), wraps can
-- have a photo of how they look, and ordered flowers keep the color the customer chose.

-- color_choices: JSON array of {"name", "hex", "isDefault"}, flowers only (exactly one default).
-- image_url: a Cloudinary photo of the option (used for wraps), or NULL.
ALTER TABLE builder_options
  ADD COLUMN color_choices JSON         NULL AFTER colors,
  ADD COLUMN image_url     VARCHAR(500) NULL AFTER color_choices;

-- Colors each flower is really sold in (also in seeds/003_bouquet_builder.sql for fresh databases).
UPDATE builder_options SET color_choices = '[{"name": "Red", "hex": "#c91f1f", "isDefault": true}, {"name": "Pink", "hex": "#f39bb0", "isDefault": false}, {"name": "White", "hex": "#f5f1e6", "isDefault": false}, {"name": "Peach", "hex": "#f7b58f", "isDefault": false}, {"name": "Yellow", "hex": "#f3d34a", "isDefault": false}, {"name": "Lavender", "hex": "#b9a2d8", "isDefault": false}]'
WHERE id = 'flower-roses' AND color_choices IS NULL;
UPDATE builder_options SET color_choices = '[{"name": "Pink", "hex": "#f27a9b", "isDefault": true}, {"name": "Red", "hex": "#d02a3a", "isDefault": false}, {"name": "White", "hex": "#f6f3ec", "isDefault": false}, {"name": "Purple", "hex": "#9a5bb8", "isDefault": false}, {"name": "Yellow", "hex": "#f2d14e", "isDefault": false}]'
WHERE id = 'flower-carnations' AND color_choices IS NULL;
UPDATE builder_options SET color_choices = '[{"name": "Pink", "hex": "#e0457b", "isDefault": true}, {"name": "White", "hex": "#f7f4ee", "isDefault": false}]'
WHERE id = 'flower-stargazer-lilies' AND color_choices IS NULL;
UPDATE builder_options SET color_choices = '[{"name": "Orange", "hex": "#ff7a3d", "isDefault": true}, {"name": "Pink", "hex": "#f27aa0", "isDefault": false}, {"name": "Red", "hex": "#d8323a", "isDefault": false}, {"name": "Yellow", "hex": "#f5cf3a", "isDefault": false}, {"name": "White", "hex": "#f7f3ea", "isDefault": false}]'
WHERE id = 'flower-gerberas' AND color_choices IS NULL;
UPDATE builder_options SET color_choices = '[{"name": "Yellow", "hex": "#f3c228", "isDefault": true}]'
WHERE id = 'flower-sunflowers' AND color_choices IS NULL;
-- Any other flower starts with its current swatch as its only color.
UPDATE builder_options
SET color_choices = JSON_ARRAY(JSON_OBJECT('name', 'Natural', 'hex', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(colors, '$[0]')), '#f2b8c6'), 'isDefault', TRUE))
WHERE option_group = 'flower' AND color_choices IS NULL;

ALTER TABLE order_item_flowers
  ADD COLUMN flower_color VARCHAR(60) NULL AFTER flower_name;
