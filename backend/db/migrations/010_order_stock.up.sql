-- Stock for customer orders: customizer flowers and fillers draw from linked inventory rows, ready-made
-- products have their own count, and a placed order records what it took so a cancellation can return it.

-- Links an inventory row to the customizer flower or filler it supplies (NULL = supplies only, e.g. wraps).
ALTER TABLE inventory_items
  ADD COLUMN builder_option_id VARCHAR(64) NULL AFTER kind,
  ADD UNIQUE KEY uq_inventory_builder_option (builder_option_id),
  ADD CONSTRAINT fk_inventory_builder_option FOREIGN KEY (builder_option_id) REFERENCES builder_options (id) ON DELETE SET NULL;

-- Existing rows that already track a customizer flower (also in seeds/004_inventory.sql for fresh databases).
UPDATE inventory_items i JOIN builder_options b ON b.id = 'flower-roses'
SET i.builder_option_id = b.id WHERE i.id = 'rose' AND i.builder_option_id IS NULL;
UPDATE inventory_items i JOIN builder_options b ON b.id = 'flower-sunflowers'
SET i.builder_option_id = b.id WHERE i.id = 'sunflower' AND i.builder_option_id IS NULL;

-- Every other customizer flower and filler gets its own inventory row to start from.
INSERT INTO inventory_items (id, kind, builder_option_id, name, description, current_stock, threshold, capacity, unit, sort_order)
SELECT b.id, 'flower', b.id, b.name, b.description, 50, 15, 100, IF(b.option_group = 'filler', 'bunches', 'stems'), 100 + b.sort_order
FROM builder_options b
WHERE b.option_group IN ('flower', 'filler')
  AND NOT EXISTS (SELECT 1 FROM inventory_items i WHERE i.builder_option_id = b.id OR i.id = b.id);

-- Ready-made bouquets the shop can still sell.
ALTER TABLE products
  ADD COLUMN stock INT UNSIGNED NOT NULL DEFAULT 0 AFTER price_php;
UPDATE products SET stock = 20;

ALTER TABLE orders
  MODIFY COLUMN status ENUM('Pending', 'Ready', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  ADD COLUMN cancelled_at  DATETIME     NULL AFTER status,
  ADD COLUMN cancel_reason VARCHAR(500) NULL AFTER cancelled_at;

-- What each order took from stock (one row per inventory item or product), returned when it's cancelled.
CREATE TABLE order_stock (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id          CHAR(36)        NOT NULL,
  inventory_item_id VARCHAR(64)     NULL,
  product_id        VARCHAR(128)    NULL,
  quantity          INT UNSIGNED    NOT NULL,
  PRIMARY KEY (id),
  KEY idx_order_stock_order (order_id),
  CONSTRAINT fk_order_stock_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_order_stock_inventory FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id) ON DELETE SET NULL,
  CONSTRAINT fk_order_stock_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL,
  CONSTRAINT chk_order_stock_quantity CHECK (quantity > 0)
);
