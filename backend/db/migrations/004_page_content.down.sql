-- Reverts 004_page_content. DESTROYS collections, home perks/steps and customizer defaults;
-- run only with explicit approval.
ALTER TABLE builder_options DROP COLUMN is_default;
DROP TABLE IF EXISTS home_steps;
DROP TABLE IF EXISTS home_perks;
DROP TABLE IF EXISTS catalog_collections;
