-- Pay-first checkout: customers pay by bank transfer or e-wallet (QR / account number set by the admin),
-- attach a screenshot, and the admin verifies it before the order can be prepared.

CREATE TABLE payment_methods (
  id             CHAR(36)     NOT NULL DEFAULT (UUID()),
  kind           ENUM('Bank', 'E-wallet') NOT NULL,
  provider       VARCHAR(80)  NOT NULL,
  account_name   VARCHAR(120) NOT NULL,
  account_number VARCHAR(64)  NOT NULL,
  qr_image_url   VARCHAR(500) NULL,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order     INT          NOT NULL DEFAULT 0,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- The payment_* details are copied from payment_methods at order time, so editing or deleting a
-- method never changes what an existing order says. Orders placed before this migration were paid on
-- pick-up; new orders start as 'Awaiting payment' (set by the API).
ALTER TABLE orders
  ADD COLUMN payment_status ENUM('Pay on pick-up', 'Awaiting payment', 'For verification', 'Verified', 'Rejected')
    NOT NULL DEFAULT 'Pay on pick-up' AFTER status,
  ADD COLUMN payment_provider       VARCHAR(80)  NULL AFTER payment_status,
  ADD COLUMN payment_account_name   VARCHAR(120) NULL AFTER payment_provider,
  ADD COLUMN payment_account_number VARCHAR(64)  NULL AFTER payment_account_name,
  ADD COLUMN payment_proof_url      VARCHAR(500) NULL AFTER payment_account_number,
  ADD COLUMN payment_submitted_at   DATETIME     NULL AFTER payment_proof_url,
  ADD COLUMN payment_reviewed_at    DATETIME     NULL AFTER payment_submitted_at,
  ADD COLUMN payment_note           VARCHAR(500) NULL AFTER payment_reviewed_at,
  ADD KEY idx_orders_payment_status (payment_status);
