-- Reverts 013_color_stock. Per-color counts are dropped (totals stay); the removed leftover inventory rows are not restored.
ALTER TABLE order_stock DROP COLUMN color_name;
DROP TABLE inventory_color_stock;
