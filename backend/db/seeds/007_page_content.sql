-- Storefront page text, collections, home perks/steps, and customizer defaults.
-- Idempotent: INSERT IGNORE only adds missing rows; UPDATEs only touch values still at their old default.

INSERT IGNORE INTO catalog_collections (id, title, filter_label, sort_order) VALUES
  ('best-sellers', 'Best Sellers', 'Best Sellers', 1),
  ('occasions', 'Occasion Flowers', 'Occasions', 2),
  ('flowers', 'Flower Bouquets', 'Flowers', 3);

INSERT IGNORE INTO home_perks (id, icon, label, sort_order) VALUES
  ('premium', '💐', 'Premium Flowers', 1),
  ('wrapping', '🎀', 'Custom Wrapping', 2),
  ('pickup', '✅', 'Pick up', 3);

INSERT IGNORE INTO home_steps (id, icon, description, sort_order) VALUES
  ('choose-flowers', 'flowers', 'Pick from roses, tulips, peonies, and more. Mix and match to your heart''s content.', 1),
  ('style', 'palette', 'Select your color palette, wrap style, ribbon, and add personal extras.', 2),
  ('pickup', 'check', 'Pick up your handcrafted bouquet fresh and beautifully packaged at our store.', 3);

-- Text wrapped in *asterisks* is rendered as the highlighted (italic/pink) part of a heading.
INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES
  ('heroTagline', 'Handcrafted with love in Pampanga'),
  ('heroSecondaryCta', 'About Us'),
  ('occasionsHeading', 'Bouquets for *Every Occasion*'),
  ('flowerTypesHeading', 'Browse by Flower Type'),
  ('featuresHeading', 'Features'),
  ('philosophyBannerTitle', 'Flowers that feel *like you.*'),
  ('philosophyBannerText', 'Design your perfect bouquet, pick it up fresh, and make every moment unforgettable.'),
  ('philosophyHeading', 'Our Philosophy'),
  ('howItWorksHeading', 'How it works?'),
  ('howItWorksSubtitle', 'Three simple steps to your dream bouquet'),
  ('reviewsHeading', 'Loved by Customers'),
  ('reviewsSubtitle', 'Real stories from real flower lovers'),
  ('pickupMethod', 'In-store pick-up'),
  ('paymentMethod', 'Cash on Pick-up');

-- The banner title now marks its highlighted words explicitly (only if the admin hasn't changed it).
UPDATE site_settings SET setting_value = 'Create Your *Dream Bouquet*'
WHERE setting_key = 'bannerTitle' AND setting_value = 'Create Your Dream Bouquet';

-- Hero secondary button renamed (only if the admin hasn't changed it).
UPDATE site_settings SET setting_value = 'About Us'
WHERE setting_key = 'heroSecondaryCta' AND setting_value = 'Why Pampanga Flowershop?';

-- Customizer starting choices, only for groups that don't have a default yet.
UPDATE builder_options AS option_row
LEFT JOIN (SELECT DISTINCT option_group FROM builder_options WHERE is_default = TRUE) AS has_default
  ON has_default.option_group = option_row.option_group
SET option_row.is_default = TRUE
WHERE option_row.id IN ('size-medium', 'palette-blush', 'wrap-korean', 'ribbon-satin')
  AND has_default.option_group IS NULL;
