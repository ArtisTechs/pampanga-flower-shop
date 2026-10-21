-- Product management from the admin panel: a customer-facing description, and room for full
-- Cloudinary image URLs (existing rows keep their relative public-folder paths).
ALTER TABLE products
  ADD COLUMN description VARCHAR(1000) NOT NULL DEFAULT '' AFTER name,
  MODIFY COLUMN image_path VARCHAR(500) NOT NULL;
