DROP TABLE builder_combination_photos;

DELETE FROM inventory_items WHERE id IN ('filler-eucalyptus', 'filler-statice-white');
DELETE FROM builder_options WHERE id IN ('filler-eucalyptus', 'filler-statice-white');
