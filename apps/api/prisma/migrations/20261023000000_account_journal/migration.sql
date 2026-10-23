CREATE TABLE "PersonalJournal" (
  "userId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "PersonalJournal_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "PersonalJournal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
