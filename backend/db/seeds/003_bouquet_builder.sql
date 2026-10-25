-- Bouquet builder options and preview images used by the customer customizer and admin builder settings.
-- INSERT IGNORE: only adds missing rows, so admin availability changes are kept on re-seed.

INSERT IGNORE INTO builder_options (id, option_group, code, name, description, price_php, colors, sort_order) VALUES
  ('size-small', 'size', 'small', 'Small', 'A sweet, simple bouquet perfect for a small but thoughtful gesture.', 850, NULL, 1),
  ('size-medium', 'size', 'medium', 'Medium', 'A balanced bouquet that makes a lovely and noticeable gift.', 1500, NULL, 2),
  ('size-large', 'size', 'large', 'Large', 'A full and eye-catching bouquet that beautifully stands out.', 2200, NULL, 3),

  ('flower-roses', 'flower', 'roses', 'Roses', 'Classic and romantic flowers that symbolize love and elegance.', 40, '["#ce2424"]', 1),
  ('flower-carnations', 'flower', 'carnations', 'Carnations', 'Ruffled, long-lasting blooms that stand for admiration and affection.', 40, '["#f27a9b"]', 2),
  ('flower-stargazer-lilies', 'flower', 'stargazer-lilies', 'Stargazer Lilies', 'Large, fragrant star-shaped lilies that make a striking centerpiece.', 40, '["#e0457b"]', 3),
  ('flower-gerberas', 'flower', 'gerberas', 'Gerberas', 'Bright, daisy-like blooms that bring cheer to any bouquet.', 40, '["#ff7a3d"]', 4),
  ('flower-sunflowers', 'flower', 'sunflowers', 'Sunflowers', 'Bright and cheerful flowers that bring warmth and positivity.', 40, '["#f3c228"]', 5),

  ('filler-asters', 'filler', 'asters', 'Asters', 'Small star-shaped blooms that add texture and soft color.', 30, '["#9b7fd4"]', 1),
  ('filler-yucca', 'filler', 'yucca', 'Yucca', 'Sword-like green leaves that add height and structure.', 30, '["#4f8a3c"]', 2),
  ('filler-babys-breath', 'filler', 'babys-breath', 'Baby''s Breath', 'Clouds of tiny white flowers for a light, airy finish.', 30, '["#f7f5ef"]', 3),
  ('filler-goldenrod', 'filler', 'goldenrod', 'Goldenrod', 'Feathery golden sprays that brighten the arrangement.', 30, '["#e2b52c"]', 4),
  ('filler-assorted-mums', 'filler', 'assorted-mums', 'Assorted Mums', 'Small mixed chrysanthemums that fill out the bouquet.', 30, '["#f2d64b", "#f7f2e8", "#c77dc7"]', 5),

  ('palette-red', 'palette', 'red', 'Red', 'Bold, passionate reds for classic romantic bouquets.', 0, '["#c91f1f", "#e43b31", "#ff4b36"]', 1),
  ('palette-blush', 'palette', 'blush', 'Blush', 'Gentle pink shades for a sweet and elegant bouquet.', 0, '["#e87072", "#f5988c", "#f6d5ce"]', 2),
  ('palette-ivory', 'palette', 'ivory', 'Ivory', 'Warm neutral flowers for a clean and graceful arrangement.', 0, '["#eeece0", "#d8bd72", "#eee1b5"]', 3),
  ('palette-purple', 'palette', 'purple', 'Purple', 'Classic romantic tones with soft violet and lavender accents.', 0, '["#8e19f4", "#9160d9", "#aa89de"]', 4),
  ('palette-blue', 'palette', 'blue', 'Blue', 'Cool, calming blues for a fresh and unexpected bouquet.', 0, '["#1f4fa8", "#3d7ad6", "#9cc1ef"]', 5),
  ('palette-black', 'palette', 'black', 'Black', 'Dramatic dark tones for a bold, modern statement.', 0, '["#141414", "#3a2a30", "#5c3a44"]', 6),

  ('wrap-korean', 'wrap', 'korean', 'Korean Style', 'Layered paper wrapping with a soft, modern floral shop finish.', 0, NULL, 1),
  ('wrap-round', 'wrap', 'round', 'Round Wrap', 'Dome-shaped wrap that frames the blooms in a full, rounded bouquet.', 0, NULL, 2),

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
