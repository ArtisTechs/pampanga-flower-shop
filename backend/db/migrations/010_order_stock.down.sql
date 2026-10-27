DROP TABLE order_stock;

UPDATE orders SET status = 'Pending' WHERE status = 'Cancelled';
ALTER TABLE orders
  DROP COLUMN cancel_reason,
  DROP COLUMN cancelled_at,
  MODIFY COLUMN status ENUM('Pending', 'Ready', 'Completed') NOT NULL DEFAULT 'Pending';

ALTER TABLE products DROP COLUMN stock;

DELETE FROM inventory_items WHERE builder_option_id IS NOT NULL AND id = builder_option_id;
ALTER TABLE inventory_items
  DROP FOREIGN KEY fk_inventory_builder_option,
  DROP KEY uq_inventory_builder_option,
  DROP COLUMN builder_option_id;
