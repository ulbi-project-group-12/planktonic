-- Compose creates the extension for dev (docker/postgres/initdb); this keeps every other
-- database (CI, Phase 4) in step. Idempotent, so it is safe on the dev database too.
CREATE EXTENSION IF NOT EXISTS vector;
