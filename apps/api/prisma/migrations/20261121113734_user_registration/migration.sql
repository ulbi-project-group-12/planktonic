BEGIN;

ALTER TABLE users
  ADD COLUMN email text,
  ADD COLUMN password_hash text,
  ADD COLUMN tz text NOT NULL DEFAULT 'Europe/Moscow',
  ADD COLUMN deactivated_at timestamptz(3),
  ALTER COLUMN id SET DEFAULT uuidv7();


UPDATE users
SET email = id::text || '@users.invalid',
    password_hash = '!';

ALTER TABLE users
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN password_hash SET NOT NULL;

CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

COMMIT;
