-- Moves the last hardcoded storefront content into MySQL: catalog collections (cross-category listings
-- and their filter tabs), home page perks and how-it-works steps, and customizer default choices.

CREATE TABLE catalog_collections (
  id           VARCHAR(64)  NOT NULL,
  title        VARCHAR(120) NOT NULL,
  filter_label VARCHAR(60)  NOT NULL,
  sort_order   INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE home_perks (
  id         VARCHAR(64)  NOT NULL,
  icon       VARCHAR(16)  NOT NULL,
  label      VARCHAR(120) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);

-- icon picks one of the illustrated step icons styled in the frontend (step-icon-<icon>).
CREATE TABLE home_steps (
  id          VARCHAR(64)  NOT NULL,
  icon        ENUM('flowers', 'palette', 'check') NOT NULL,
  description VARCHAR(500) NOT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);

-- The customizer starts on the default option of each group (falls back to the first available one).
ALTER TABLE builder_options
  ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT FALSE AFTER is_available;
