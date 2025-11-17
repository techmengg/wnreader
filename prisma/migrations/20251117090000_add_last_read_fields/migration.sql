-- Add last read tracking columns to Novel
ALTER TABLE "Novel"
  ADD COLUMN "lastReadChapterId" TEXT,
  ADD COLUMN "lastReadAt" TIMESTAMP(3);

-- Wire up relation from Novel.lastReadChapterId -> Chapter.id
ALTER TABLE "Novel"
  ADD CONSTRAINT "Novel_lastReadChapterId_fkey"
  FOREIGN KEY ("lastReadChapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

