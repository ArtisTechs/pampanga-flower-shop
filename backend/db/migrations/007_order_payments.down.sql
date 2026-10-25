-- Reverts 007_order_payments. DESTROYS payment methods and every order's payment details and screenshot links.
ALTER TABLE orders
  DROP KEY idx_orders_payment_status,
  DROP COLUMN payment_note,
  DROP COLUMN payment_reviewed_at,
  DROP COLUMN payment_submitted_at,
  DROP COLUMN payment_proof_url,
  DROP COLUMN payment_account_number,
  DROP COLUMN payment_account_name,
  DROP COLUMN payment_provider,
  DROP COLUMN payment_status;

DROP TABLE payment_methods;
