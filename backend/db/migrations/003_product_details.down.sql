-- Reverts 003_product_details. DESTROYS product descriptions, and fails if any image_path is longer
-- than 255 characters; run only with explicit approval.
ALTER TABLE products
  MODIFY COLUMN image_path VARCHAR(255) NOT NULL,
  DROP COLUMN description;
