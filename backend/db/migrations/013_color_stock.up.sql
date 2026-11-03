-- Flower stock per color, and removal of inventory rows whose flower or filler no longer exists.

-- Deleting a customizer flower/filler used to leave its inventory row behind (the link was just set to NULL).
-- Flower rows with no link are those leftovers (and the old seed flowers that were never in the customizer).
DELETE FROM inventory_items WHERE kind = 'flower' AND builder_option_id IS NULL;

-- One row per color of a customizer flower. inventory_items.current_stock stays the total of its colors.
CREATE TABLE inventory_color_stock (
  inventory_item_id VARCHAR(64)  NOT NULL,
  color_name        VARCHAR(64)  NOT NULL,
  current_stock     INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (inventory_item_id, color_name),
  CONSTRAINT fk_color_stock_inventory FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id) ON DELETE CASCADE
);

-- Which color an order took (NULL for fillers, supplies and bouquets), so a cancellation returns the same color.
ALTER TABLE order_stock
  ADD COLUMN color_name VARCHAR(64) NULL AFTER product_id;

-- Existing stock is split evenly over the colors the flower has now; the first color keeps the remainder.
INSERT INTO inventory_color_stock (inventory_item_id, color_name, current_stock)
SELECT i.id, c.name,
       FLOOR(i.current_stock / JSON_LENGTH(b.color_choices)) + IF(c.idx = 1, i.current_stock MOD JSON_LENGTH(b.color_choices), 0)
FROM inventory_items i
JOIN builder_options b ON b.id = i.builder_option_id AND b.option_group = 'flower'
JOIN JSON_TABLE(b.color_choices, '$[*]' COLUMNS (idx FOR ORDINALITY, name VARCHAR(64) PATH '$.name')) c
WHERE JSON_LENGTH(b.color_choices) > 0;
