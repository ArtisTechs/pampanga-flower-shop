ALTER TABLE order_item_flowers DROP COLUMN flower_color;

ALTER TABLE builder_options
  DROP COLUMN image_url,
  DROP COLUMN color_choices;
