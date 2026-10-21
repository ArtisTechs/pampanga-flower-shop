-- Reverts 002_storefront_admin. DESTROYS sessions, home content, builder, inventory details and custom
-- order data; run only with explicit approval.
DROP TABLE IF EXISTS order_item_flowers;
ALTER TABLE orders DROP KEY idx_orders_created;
ALTER TABLE order_items DROP COLUMN customization;

ALTER TABLE inventory_items
  DROP COLUMN sort_order,
  DROP COLUMN unit,
  DROP COLUMN capacity,
  DROP COLUMN description,
  DROP COLUMN kind;
RENAME TABLE inventory_items TO flower_stock;

DROP TABLE IF EXISTS builder_previews;
DROP TABLE IF EXISTS builder_options;
DROP TABLE IF EXISTS site_settings;
DROP TABLE IF EXISTS testimonials;
DROP TABLE IF EXISTS home_features;

ALTER TABLE categories
  DROP COLUMN show_on_home,
  DROP COLUMN card_image_path,
  DROP COLUMN card_subtitle,
  DROP COLUMN card_title;

DROP TABLE IF EXISTS sessions;

ALTER TABLE users
  DROP COLUMN tier,
  DROP COLUMN status;
