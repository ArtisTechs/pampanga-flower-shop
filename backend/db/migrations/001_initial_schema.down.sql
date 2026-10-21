-- Reverts 001_initial_schema. DESTROYS ALL DATA in these tables; run only with explicit approval.
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS flower_stock;
DROP TABLE IF EXISTS users;
