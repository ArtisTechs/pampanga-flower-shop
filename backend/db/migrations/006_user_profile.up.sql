-- Customer profiles: separate first/last names and a profile photo (Cloudinary URL).
-- full_name stays as the combined display name (orders, admin lists, sessions read it); the API keeps it
-- in sync whenever a name changes.

ALTER TABLE users
  ADD COLUMN first_name VARCHAR(60)  NOT NULL DEFAULT '' AFTER role,
  ADD COLUMN last_name  VARCHAR(60)  NOT NULL DEFAULT '' AFTER first_name,
  ADD COLUMN avatar_url VARCHAR(500) NULL AFTER contact_number;

-- Existing names: the first word becomes the first name, the rest the last name.
-- Customers can correct the split on their profile page.
UPDATE users SET
  first_name = LEFT(SUBSTRING_INDEX(TRIM(full_name), ' ', 1), 60),
  last_name  = LEFT(TRIM(SUBSTRING(TRIM(full_name), CHAR_LENGTH(SUBSTRING_INDEX(TRIM(full_name), ' ', 1)) + 1)), 60);

ALTER TABLE users
  ALTER COLUMN first_name DROP DEFAULT,
  ALTER COLUMN last_name DROP DEFAULT;
