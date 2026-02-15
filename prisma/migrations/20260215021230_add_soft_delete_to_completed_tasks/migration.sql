-- AlterTable
ALTER TABLE "CompletedTask" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "CompletedTask_deletedAt_idx" ON "CompletedTask"("deletedAt");
