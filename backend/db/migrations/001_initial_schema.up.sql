-- Initial schema mirroring the frontend types in frontend/src/types/shop.ts.

CREATE TABLE users (
  id             CHAR(36)      NOT NULL DEFAULT (UUID()),
  role           ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  full_name      VARCHAR(120)  NOT NULL,
  email          VARCHAR(255)  NOT NULL,
  password_hash  VARCHAR(255)  NOT NULL,
  contact_number VARCHAR(32)   NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
);

CREATE TABLE categories (
  id              VARCHAR(64)  NOT NULL,
  title           VARCHAR(120) NOT NULL,
  route           VARCHAR(160) NOT NULL,
  collection_type ENUM('occasions', 'flowers') NOT NULL,
  sort_order      INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_route (route)
);

CREATE TABLE products (
  id          VARCHAR(128)  NOT NULL,
  category_id VARCHAR(64)   NOT NULL,
  name        VARCHAR(160)  NOT NULL,
  price_php   DECIMAL(10,2) NOT NULL,
  image_path  VARCHAR(255)  NOT NULL,
  best_seller BOOLEAN       NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order  INT           NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_category (category_id, sort_order),
  KEY idx_products_best_seller (best_seller),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id),
  CONSTRAINT chk_products_price CHECK (price_php >= 0)
);

CREATE TABLE orders (
  id             CHAR(36)      NOT NULL DEFAULT (UUID()),
  user_id        CHAR(36)      NULL,
  customer_name  VARCHAR(120)  NOT NULL,
  contact_number VARCHAR(32)   NOT NULL,
  bouquet_size   ENUM('Small', 'Medium', 'Large', 'Extra Large') NULL,
  pickup_at      DATETIME      NOT NULL,
  total_php      DECIMAL(10,2) NOT NULL,
  status         ENUM('Pending', 'Ready', 'Completed') NOT NULL DEFAULT 'Pending',
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_orders_status_pickup (status, pickup_at),
  KEY idx_orders_user (user_id),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_orders_total CHECK (total_php >= 0)
);

CREATE TABLE order_items (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id       CHAR(36)        NOT NULL,
  product_id     VARCHAR(128)    NULL,
  product_name   VARCHAR(160)    NOT NULL,
  unit_price_php DECIMAL(10,2)   NOT NULL,
  quantity       INT UNSIGNED    NOT NULL,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL,
  CONSTRAINT chk_order_items_quantity CHECK (quantity > 0)
);

CREATE TABLE flower_stock (
  id            VARCHAR(64)  NOT NULL,
  name          VARCHAR(120) NOT NULL,
  current_stock INT UNSIGNED NOT NULL DEFAULT 0,
  threshold     INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
