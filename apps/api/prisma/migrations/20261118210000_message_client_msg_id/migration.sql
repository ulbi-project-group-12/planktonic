-- UL-126: idempotent send. The client makes one `clientMsgId` (UUIDv7) per message and resends it
-- on retry; UNIQUE (author_id, client_msg_id) turns a retry into "return the stored message".

-- Rows that exist before this migration (seed and dev data from UL-125) get their own `id` as the
-- key: it is a UUIDv7 and unique, so the backfill cannot collide. The column is NOT NULL only after
-- that, so the migration works on a non-empty table without recreating the dev database.
ALTER TABLE "messages" ADD COLUMN "client_msg_id" UUID;
UPDATE "messages" SET "client_msg_id" = "id";
ALTER TABLE "messages" ALTER COLUMN "client_msg_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "messages_author_id_client_msg_id_key" ON "messages"("author_id", "client_msg_id");
