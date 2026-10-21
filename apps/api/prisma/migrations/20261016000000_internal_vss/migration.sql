ALTER TYPE "Role" ADD VALUE 'VSS_REFERENT';
CREATE TYPE "VssStatus" AS ENUM ('RECEIVED', 'REVIEWING', 'CLOSED');
CREATE TABLE "VssReport" (
  "id" TEXT NOT NULL, "teamId" TEXT NOT NULL, "submissionKey" TEXT NOT NULL,
  "encryptedPayload" TEXT NOT NULL, "questionnaireVersion" INTEGER NOT NULL,
  "status" "VssStatus" NOT NULL DEFAULT 'RECEIVED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VssReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VssReport_teamId_submissionKey_key" ON "VssReport"("teamId", "submissionKey");
CREATE INDEX "VssReport_teamId_createdAt_idx" ON "VssReport"("teamId", "createdAt");
ALTER TABLE "VssReport" ADD CONSTRAINT "VssReport_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "VssAccess" ("id" TEXT NOT NULL, "reportId" TEXT NOT NULL, "actorId" TEXT NOT NULL, "action" TEXT NOT NULL, "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "VssAccess_pkey" PRIMARY KEY ("id"));
ALTER TABLE "VssAccess" ADD CONSTRAINT "VssAccess_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "VssReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
