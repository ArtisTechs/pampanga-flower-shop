-- Home page content: category cards, features, testimonials, and admin-editable website content.
-- Idempotent: INSERT IGNORE only adds missing rows; card UPDATEs only fill cards that are still empty.

-- Flower types shown on the home page that have no products yet (their listing shows the empty state).
INSERT IGNORE INTO categories (id, title, route, collection_type, sort_order) VALUES
  ('carnation', 'Carnations', '/flowers/carnation', 'flowers', 12),
  ('tulip', 'Tulips', '/flowers/tulip', 'flowers', 13),
  ('gerbera', 'Gerberas', '/flowers/gerbera', 'flowers', 14);

UPDATE categories SET card_title = 'Anniversary Picks', card_subtitle = 'Anniversary Flowers', card_image_path = 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628902/pampanga-flower-shop/catalog/categories/occasions/anniversary.jpg', show_on_home = TRUE WHERE id = 'anniversary' AND card_title IS NULL;
UPDATE categories SET card_title = 'Birthday Picks', card_subtitle = 'Birthday Flowers', card_image_path = 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628903/pampanga-flower-shop/catalog/categories/occasions/birthday.jpg', show_on_home = TRUE WHERE id = 'birthday' AND card_title IS NULL;
UPDATE categories SET card_title = 'Congratulatory Picks', card_subtitle = 'Congratulatory Flowers', card_image_path = 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628903/pampanga-flower-shop/catalog/categories/occasions/congrats.jpg', show_on_home = TRUE WHERE id = 'congrats' AND card_title IS NULL;
UPDATE categories SET card_title = 'Get Well Picks', card_subtitle = 'Get Well Picks', card_image_path = 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628903/pampanga-flower-shop/catalog/categories/occasions/getwell.jpg', show_on_home = TRUE WHERE id = 'getwell' AND card_title IS NULL;
UPDATE categories SET card_title = 'Apology Picks', card_subtitle = 'Apology Flowers', card_image_path = 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628902/pampanga-flower-shop/catalog/categories/occasions/apology.jpg', show_on_home = TRUE WHERE id = 'apology' AND card_title IS NULL;
UPDATE categories SET card_title = 'Romantic Picks', card_subtitle = 'Romantic Flowers', card_image_path = 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628903/pampanga-flower-shop/catalog/categories/occasions/romantic.jpg', show_on_home = TRUE WHERE id = 'romantic' AND card_title IS NULL;
UPDATE categories SET card_title = 'Sympathy Picks', card_subtitle = 'Sympathy & Funeral Flowers', card_image_path = 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628904/pampanga-flower-shop/catalog/categories/occasions/sympathy.jpg', show_on_home = TRUE WHERE id = 'sympathy' AND card_title IS NULL;
UPDATE categories SET card_title = 'Thank You Picks', card_subtitle = 'Thank You Flowers', card_image_path = 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628904/pampanga-flower-shop/catalog/categories/occasions/thankyou.jpg', show_on_home = TRUE WHERE id = 'thankyou' AND card_title IS NULL;
UPDATE categories SET card_title = 'Roses', card_subtitle = 'Rose Bouquets', card_image_path = 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628901/pampanga-flower-shop/catalog/categories/flower-types/roses.jpg', show_on_home = TRUE WHERE id = 'rose' AND card_title IS NULL;
UPDATE categories SET card_title = 'Sunflowers', card_subtitle = 'Sunflower Bouquets', card_image_path = 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628902/pampanga-flower-shop/catalog/categories/flower-types/sunflowers.jpg', show_on_home = TRUE WHERE id = 'sunflower' AND card_title IS NULL;
UPDATE categories SET card_title = 'Lilies', card_subtitle = 'Lily Bouquets', card_image_path = 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628901/pampanga-flower-shop/catalog/categories/flower-types/lilies.jpg', show_on_home = TRUE WHERE id = 'lily' AND card_title IS NULL;
UPDATE categories SET card_title = 'Carnations', card_subtitle = 'Carnation Bouquets', card_image_path = 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628901/pampanga-flower-shop/catalog/categories/flower-types/carnations.jpg', show_on_home = TRUE WHERE id = 'carnation' AND card_title IS NULL;
UPDATE categories SET card_title = 'Tulips', card_subtitle = 'Tulip Bouquets', card_image_path = 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628902/pampanga-flower-shop/catalog/categories/flower-types/tulips.jpg', show_on_home = TRUE WHERE id = 'tulip' AND card_title IS NULL;
UPDATE categories SET card_title = 'Gerberas', card_subtitle = 'Gerbera Bouquets', card_image_path = 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628901/pampanga-flower-shop/catalog/categories/flower-types/gerberas.jpg', show_on_home = TRUE WHERE id = 'gerbera' AND card_title IS NULL;

INSERT IGNORE INTO home_features (id, icon, title, description, sort_order) VALUES
  ('custom', '🌟', 'Fully Customizable', 'Choose every detail — flowers, colors, wrapping, and ribbon to create your perfect bouquet.', 1),
  ('love', '💗', 'Made with Love', 'Each bouquet is handcrafted by our expert florists using the freshest seasonal blooms.', 2),
  ('occasion', '🎁', 'Perfect for Any Occasion', 'Birthdays, anniversaries, weddings, or just because — we have the perfect arrangement.', 3);

INSERT IGNORE INTO testimonials (id, author_name, quote, rating, sort_order) VALUES
  ('sofia', 'Sofia R.', 'The bouquet builder is so fun! I designed exactly what I envisioned and it arrived even more beautiful.', 5, 1),
  ('avril', 'Avril A.', 'Absolutely stunning quality. The Korean-style wrap was gorgeous and the peonies were so fresh!', 5, 2),
  ('jasmine', 'Jasmine T.', 'I used the Surprise Me feature and got the most gorgeous pastel arrangement. Will order again!', 5, 3);

INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES
  ('bannerTitle', 'Create Your Dream Bouquet'),
  ('bannerSubtitle', 'Mix flowers, choose wrappers, and design a bouquet made just for your loved ones.'),
  ('shopName', 'Pampanga Flower Shop'),
  ('operatingHours', 'Mon-Sat 8AM-6PM'),
  ('fullAddress', '123 San Fernando Blvd, San Fernando, Pampanga, Philippines'),
  ('aboutText', 'We craft fresh handcrafted bouquets for birthdays, anniversaries, and everyday surprises.');
