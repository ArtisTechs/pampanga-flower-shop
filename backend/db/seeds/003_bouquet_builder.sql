-- Bouquet builder options and preview images used by the customer customizer and admin builder settings.
-- INSERT IGNORE: only adds missing rows, so admin availability changes are kept on re-seed.

INSERT IGNORE INTO builder_options (id, option_group, code, name, description, price_php, colors, sort_order) VALUES
  ('size-small', 'size', 'small', 'Small', 'A sweet, simple bouquet perfect for a small but thoughtful gesture.', 850, NULL, 1),
  ('size-medium', 'size', 'medium', 'Medium', 'A balanced bouquet that makes a lovely and noticeable gift.', 1500, NULL, 2),
  ('size-large', 'size', 'large', 'Large', 'A full and eye-catching bouquet that beautifully stands out.', 2200, NULL, 3),

  ('flower-roses', 'flower', 'roses', 'Roses', 'Classic and romantic flowers that symbolize love and elegance.', 40, '["#ce2424"]', 1),
  ('flower-tulips', 'flower', 'tulips', 'Tulips', 'Simple and graceful blooms that represent happiness and fresh beginnings.', 40, '["#ff8b84"]', 2),
  ('flower-sunflowers', 'flower', 'sunflowers', 'Sunflowers', 'Bright and cheerful flowers that bring warmth and positivity.', 40, '["#f3c228"]', 3),
  ('flower-daisies', 'flower', 'daisies', 'Daisies', 'Light and charming blooms that symbolize innocence and joy.', 40, '["#f1da4f"]', 4),
  ('flower-peonies', 'flower', 'peonies', 'Peonies', 'Soft and luxurious flowers known for their full petals and timeless beauty.', 40, '["#ff9eb6"]', 5),

  ('palette-red', 'palette', 'red', 'Red', 'Bold, passionate reds for classic romantic bouquets.', 0, '["#c91f1f", "#e43b31", "#ff4b36"]', 1),
  ('palette-blush', 'palette', 'blush', 'Blush', 'Gentle pink shades for a sweet and elegant bouquet.', 0, '["#e87072", "#f5988c", "#f6d5ce"]', 2),
  ('palette-ivory', 'palette', 'ivory', 'Ivory', 'Warm neutral flowers for a clean and graceful arrangement.', 0, '["#eeece0", "#d8bd72", "#eee1b5"]', 3),
  ('palette-purple', 'palette', 'purple', 'Purple', 'Classic romantic tones with soft violet and lavender accents.', 0, '["#8e19f4", "#9160d9", "#aa89de"]', 4),
  ('palette-burgundy', 'palette', 'burgundy', 'Burgundy', 'Deep red tones for dramatic and refined occasions.', 0, '["#7c171d", "#9f2828", "#ce3634"]', 5),
  ('palette-orange', 'palette', 'orange', 'Orange', 'Vibrant sunset colors for bright, joyful celebrations.', 0, '["#d15e00", "#e0781d", "#ff7817"]', 6),

  ('wrap-kraft', 'wrap', 'kraft', 'Kraft Paper', 'A natural wrap style that keeps the bouquet warm and rustic.', 0, NULL, 1),
  ('wrap-korean', 'wrap', 'korean', 'Korean Style', 'Layered paper wrapping with a soft, modern floral shop finish.', 0, NULL, 2),
  ('wrap-mesh', 'wrap', 'mesh', 'Mesh Wrapper', 'Textured mesh wrap for a layered, airy presentation.', 0, NULL, 3),
  ('wrap-transparent', 'wrap', 'transparent', 'Transparent', 'Clear wrapping that lets every bloom show through.', 0, NULL, 4),

  ('ribbon-satin', 'ribbon', 'satin', 'Satin Ribbon', 'Smooth ribbon with a clean bow for classic flower arrangements.', 0, NULL, 1),
  ('ribbon-velvet', 'ribbon', 'velvet', 'Velvet Ribbon', 'Plush velvet ribbon for a rich, premium finish.', 0, NULL, 2),
  ('ribbon-twine', 'ribbon', 'twine', 'Twine', 'Natural twine tie for rustic, countryside-inspired bouquets.', 0, NULL, 3);

INSERT IGNORE INTO builder_previews (flower_count, image_path, flower_codes, palette_codes, wrap_codes, ribbon_codes, sort_order) VALUES
  (1, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628905/pampanga-flower-shop/catalog/customize-previews/1-flower/single-blush-rose-transparent-wrap-peach-ribbon.webp', '["roses"]', '["blush"]', '["transparent"]', '["satin"]', 1),
  (1, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628904/pampanga-flower-shop/catalog/customize-previews/1-flower/single-ivory-rose-kraft-wrap-twine.webp', '["roses"]', '["ivory"]', '["kraft"]', '["twine"]', 2),
  (1, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628906/pampanga-flower-shop/catalog/customize-previews/1-flower/single-purple-rose-transparent-wrap-purple-ribbon.webp', '["roses"]', '["purple"]', '["transparent"]', '["velvet"]', 3),
  (1, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628906/pampanga-flower-shop/catalog/customize-previews/1-flower/single-red-rose-burgundy-wrap-twine.webp', '["roses"]', '["burgundy"]', '["korean"]', '["twine"]', 4),
  (1, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628906/pampanga-flower-shop/catalog/customize-previews/1-flower/single-red-rose-kraft-wrap-red-ribbon.webp', '["roses"]', '["red"]', '["kraft"]', '["satin","velvet"]', 5),
  (2, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628906/pampanga-flower-shop/catalog/customize-previews/2-flowers/two-blush-roses-burgundy-wrap-velvet-ribbon.webp', '["roses","peonies"]', '["blush","burgundy"]', '["korean"]', '["velvet"]', 6),
  (2, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628907/pampanga-flower-shop/catalog/customize-previews/2-flowers/two-pink-roses-transparent-wrap-burgundy-ribbon.webp', '["roses","peonies"]', '["blush","burgundy"]', '["transparent"]', '["velvet"]', 7),
  (2, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628907/pampanga-flower-shop/catalog/customize-previews/2-flowers/two-red-roses-kraft-wrap-red-ribbon.webp', '["roses"]', '["red","burgundy"]', '["kraft"]', '["satin","velvet"]', 8),
  (2, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628907/pampanga-flower-shop/catalog/customize-previews/2-flowers/two-sunflower-blush-rose-peach-wrap-satin-ribbon.webp', '["sunflowers","roses"]', '["blush","orange"]', '["korean"]', '["satin"]', 9),
  (2, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628907/pampanga-flower-shop/catalog/customize-previews/2-flowers/two-sunflower-daisy-kraft-wrap-twine.webp', '["sunflowers","daisies"]', '["ivory","orange"]', '["kraft"]', '["twine"]', 10),
  (3, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628908/pampanga-flower-shop/catalog/customize-previews/3-flowers/three-red-blush-roses-burgundy-wrap-twine.webp', '["roses","peonies"]', '["red","burgundy","blush"]', '["korean"]', '["twine"]', 11),
  (3, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628908/pampanga-flower-shop/catalog/customize-previews/3-flowers/three-rose-sunflower-kraft-wrap-burgundy-ribbon.webp', '["roses","sunflowers"]', '["red","orange"]', '["kraft"]', '["velvet"]', 12),
  (3, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628908/pampanga-flower-shop/catalog/customize-previews/3-flowers/three-sunflower-pink-roses-kraft-wrap-twine.webp', '["sunflowers","roses"]', '["blush","orange","ivory"]', '["kraft"]', '["twine"]', 13),
  (3, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628908/pampanga-flower-shop/catalog/customize-previews/3-flowers/three-sunflower-pink-roses-peach-wrap-satin-ribbon.webp', '["sunflowers","roses","peonies"]', '["blush","orange"]', '["korean"]', '["satin"]', 14),
  (3, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628910/pampanga-flower-shop/catalog/customize-previews/3-flowers/three-sunflowers-transparent-wrap-green-ribbon.webp', '["sunflowers","daisies"]', '["orange","ivory"]', '["transparent"]', '["twine"]', 15),
  (4, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628909/pampanga-flower-shop/catalog/customize-previews/4-flowers/four-pink-tulips-rose-burgundy-wrap-velvet-ribbon.webp', '["tulips","roses"]', '["blush","burgundy"]', '["korean"]', '["velvet"]', 16),
  (4, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628910/pampanga-flower-shop/catalog/customize-previews/4-flowers/four-sunflower-daisies-pink-rose-peach-wrap-satin-ribbon.webp', '["sunflowers","daisies","roses","peonies"]', '["blush","orange","ivory"]', '["korean"]', '["satin"]', 17),
  (4, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628910/pampanga-flower-shop/catalog/customize-previews/4-flowers/four-sunflower-pink-rose-kraft-wrap-red-ribbon.webp', '["sunflowers","roses","peonies"]', '["red","orange","blush"]', '["kraft"]', '["satin","velvet"]', 18),
  (4, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628911/pampanga-flower-shop/catalog/customize-previews/4-flowers/four-sunflower-pink-rose-transparent-wrap-purple-ribbon.webp', '["sunflowers","roses","peonies"]', '["purple","blush","orange"]', '["transparent"]', '["velvet"]', 19),
  (4, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628911/pampanga-flower-shop/catalog/customize-previews/4-flowers/four-sunflowers-red-rose-kraft-wrap-twine.webp', '["sunflowers","roses"]', '["red","orange"]', '["kraft"]', '["twine"]', 20),
  (5, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628912/pampanga-flower-shop/catalog/customize-previews/5-flowers/five-mixed-pink-red-sunflower-white-wrap-satin-ribbon.webp', '["roses","sunflowers","daisies","peonies"]', '["red","blush","ivory","orange"]', '["transparent"]', '["satin"]', 21),
  (5, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628911/pampanga-flower-shop/catalog/customize-previews/5-flowers/five-pink-roses-peonies-white-wrap-purple-ribbon.webp', '["roses","peonies"]', '["purple","blush"]', '["transparent"]', '["velvet"]', 22),
  (5, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628913/pampanga-flower-shop/catalog/customize-previews/5-flowers/five-red-roses-kraft-wrap-burgundy-ribbon.webp', '["roses"]', '["red","burgundy"]', '["kraft"]', '["velvet","twine"]', 23),
  (5, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628913/pampanga-flower-shop/catalog/customize-previews/5-flowers/five-sunflowers-kraft-wrap-twine.webp', '["sunflowers"]', '["orange","ivory"]', '["kraft"]', '["twine"]', 24),
  (5, 'https://res.cloudinary.com/dwbd9mljg/image/upload/v1792628913/pampanga-flower-shop/catalog/customize-previews/5-flowers/five-sunflowers-pink-roses-kraft-wrap-satin-ribbon.webp', '["sunflowers","roses","peonies"]', '["blush","orange"]', '["kraft","korean"]', '["satin"]', 25);
