-- Reverts 005_email_otps. Drops pending one-time codes (they expire within minutes anyway).
DROP TABLE IF EXISTS email_otps;
