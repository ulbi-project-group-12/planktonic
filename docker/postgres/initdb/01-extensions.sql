-- The Postgres image entrypoint runs this file once, when it initialises an empty data volume.
-- The api's first Prisma migration runs the same idempotent statement, so databases this file
-- never touched (an existing volume, a managed server) get the extension too.
CREATE EXTENSION IF NOT EXISTS vector;
