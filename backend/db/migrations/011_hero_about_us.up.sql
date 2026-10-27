-- Hosted databases only run migrations, never seeds, so the hero button rename from seeds/007_page_content.sql
-- is repeated here. Only changes the old default, so text the admin set is kept.
UPDATE site_settings SET setting_value = 'About Us'
WHERE setting_key = 'heroSecondaryCta' AND setting_value = 'Why Pampanga Flowershop?';
