CREATE TYPE "IdeaCategory" AS ENUM ('GAME', 'OUTING', 'WELLBEING', 'OTHER');
CREATE TYPE "IdeaStatus" AS ENUM ('NEW', 'REVIEWING', 'PLANNED', 'DECLINED');
CREATE TABLE "Idea" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "category" "IdeaCategory" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "IdeaStatus" NOT NULL DEFAULT 'NEW',
  "managerNote" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Idea_teamId_id_idx" ON "Idea"("teamId", "id");
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
