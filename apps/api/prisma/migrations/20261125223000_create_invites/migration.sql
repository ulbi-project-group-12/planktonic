CREATE TABLE "invites" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "workspace_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "role" "ws_role" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "consumed_at" TIMESTAMPTZ(3),

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);


CREATE UNIQUE INDEX "invites_token_hash_key" ON "invites"("token_hash");


CREATE INDEX "invites_workspace_id_idx" ON "invites"("workspace_id");


CREATE INDEX "invites_created_by_id_idx" ON "invites"("created_by_id");


ALTER TABLE "invites" ADD CONSTRAINT "invites_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "invites" ADD CONSTRAINT "invites_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
