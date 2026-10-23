-- One-time codes emailed for sign-up verification and password resets.
-- Only a SHA-256 of each code is stored; times are UTC.

CREATE TABLE email_otps (
  id          CHAR(36)                  NOT NULL,
  email       VARCHAR(255)              NOT NULL,
  purpose     ENUM('signup', 'reset')   NOT NULL,
  code_hash   CHAR(64)                  NOT NULL,
  attempts    TINYINT UNSIGNED          NOT NULL DEFAULT 0,
  created_at  DATETIME                  NOT NULL,
  expires_at  DATETIME                  NOT NULL,
  consumed_at DATETIME                  NULL,
  PRIMARY KEY (id),
  KEY idx_email_otps_lookup (email, purpose, created_at)
);
