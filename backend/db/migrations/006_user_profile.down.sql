-- Reverts 006_user_profile. full_name already holds the combined name; DESTROYS profile photo URLs.
ALTER TABLE users
  DROP COLUMN avatar_url,
  DROP COLUMN last_name,
  DROP COLUMN first_name;
