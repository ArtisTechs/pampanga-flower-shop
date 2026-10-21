-- Moves the remaining frontend mock data into MySQL: auth sessions, home content, bouquet builder
-- options, inventory, user status, and custom bouquet order details.

ALTER TABLE users
  ADD COLUMN status ENUM('Active', 'Disabled') NOT NULL DEFAULT 'Active' AFTER contact_number,
  ADD COLUMN tier   ENUM('Customer', 'VIP')    NOT NULL DEFAULT 'Customer' AFTER status;

-- Opaque login tokens; only the SHA-256 of each token is stored.
CREATE TABLE sessions (
  token_hash CHAR(64)  NOT NULL,
  user_id    CHAR(36)  NOT NULL,
  expires_at DATETIME  NOT NULL,
  created_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Home page cards for occasion and flower type categories.
ALTER TABLE categories
  ADD COLUMN card_title      VARCHAR(120) NULL AFTER collection_type,
  ADD COLUMN card_subtitle   VARCHAR(160) NULL AFTER card_title,
  ADD COLUMN card_image_path VARCHAR(255) NULL AFTER card_subtitle,
  ADD COLUMN show_on_home    BOOLEAN      NOT NULL DEFAULT FALSE AFTER card_image_path;

CREATE TABLE home_features (
  id          VARCHAR(64)  NOT NULL,
  icon        VARCHAR(16)  NOT NULL,
  title       VARCHAR(120) NOT NULL,
  description VARCHAR(500) NOT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE testimonials (
  id           VARCHAR(64)      NOT NULL,
  author_name  VARCHAR(120)     NOT NULL,
  quote        VARCHAR(1000)    NOT NULL,
  rating       TINYINT UNSIGNED NOT NULL DEFAULT 5,
  is_published BOOLEAN          NOT NULL DEFAULT TRUE,
  sort_order   INT              NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT chk_testimonials_rating CHECK (rating BETWEEN 1 AND 5)
);

-- Admin-editable website content (banner, shop info, address, about text).
CREATE TABLE site_settings (
  setting_key   VARCHAR(64) NOT NULL,
  setting_value TEXT        NOT NULL,
  updated_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
);

-- Options offered by the customer bouquet builder. price_php is the base price for sizes and the
-- per-stem price for flowers; colors holds swatch hex values for flowers and palettes.
CREATE TABLE builder_options (
  id           VARCHAR(64)   NOT NULL,
  option_group ENUM('size', 'flower', 'palette', 'wrap', 'ribbon') NOT NULL,
  code         VARCHAR(32)   NOT NULL,
  name         VARCHAR(120)  NOT NULL,
  description  VARCHAR(500)  NOT NULL DEFAULT '',
  price_php    DECIMAL(10,2) NOT NULL DEFAULT 0,
  colors       JSON          NULL,
  is_available BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order   INT           NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_builder_options_group_code (option_group, code),
  CONSTRAINT chk_builder_options_price CHECK (price_php >= 0)
);

-- Preview images matched against a customer's selection; the *_codes columns are JSON arrays of builder_options.code.
CREATE TABLE builder_previews (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  flower_count  TINYINT UNSIGNED NOT NULL,
  image_path    VARCHAR(255)     NOT NULL,
  flower_codes  JSON             NOT NULL,
  palette_codes JSON             NOT NULL,
  wrap_codes    JSON             NOT NULL,
  ribbon_codes  JSON             NOT NULL,
  sort_order    INT              NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_builder_previews_image (flower_count, image_path)
);

-- flower_stock becomes the general inventory (flowers and add-ons).
RENAME TABLE flower_stock TO inventory_items;
ALTER TABLE inventory_items
  ADD COLUMN kind        ENUM('flower', 'add-on') NOT NULL DEFAULT 'flower' AFTER id,
  ADD COLUMN description VARCHAR(500) NOT NULL DEFAULT '' AFTER name,
  ADD COLUMN capacity    INT UNSIGNED NOT NULL DEFAULT 100 AFTER threshold,
  ADD COLUMN unit        VARCHAR(32)  NOT NULL DEFAULT 'stems' AFTER capacity,
  ADD COLUMN sort_order  INT          NOT NULL DEFAULT 0 AFTER unit;

-- Custom bouquet details for order items: { size, palette, wrap, ribbon } names at order time.
ALTER TABLE order_items
  ADD COLUMN customization JSON NULL AFTER quantity;

ALTER TABLE orders
  ADD KEY idx_orders_created (created_at);

CREATE TABLE order_item_flowers (
  order_item_id BIGINT UNSIGNED NOT NULL,
  flower_code   VARCHAR(32)     NOT NULL,
  flower_name   VARCHAR(120)    NOT NULL,
  quantity      INT UNSIGNED    NOT NULL,
  PRIMARY KEY (order_item_id, flower_code),
  CONSTRAINT fk_order_item_flowers_item FOREIGN KEY (order_item_id) REFERENCES order_items (id) ON DELETE CASCADE,
  CONSTRAINT chk_order_item_flowers_quantity CHECK (quantity > 0)
);
