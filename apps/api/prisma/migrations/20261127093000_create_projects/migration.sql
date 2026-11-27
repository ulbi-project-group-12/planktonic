-- CreateEnum
CREATE TYPE "project_role" AS ENUM ('ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "workspace_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "project_role" NOT NULL,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_workspace_id_key_key" ON "projects"("workspace_id", "key");

-- CreateIndex
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
