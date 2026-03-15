/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `UserInfo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `CompletedTask` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `TimeRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `UserInfo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `WeeklyPlanEntry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CompletedTask" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TimeRecord" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserInfo" ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WeeklyPlanEntry" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "TimetableEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "plannedStart" TEXT NOT NULL,
    "plannedEnd" TEXT NOT NULL,
    "expectedMinutes" INTEGER NOT NULL,
    "activityName" TEXT NOT NULL,
    "actualStart" TEXT,
    "actualEnd" TEXT,
    "actualMinutes" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimetableEntry_userId_idx" ON "TimetableEntry"("userId");

-- CreateIndex
CREATE INDEX "TimetableEntry_date_idx" ON "TimetableEntry"("date");

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE INDEX "CompletedTask_userId_idx" ON "CompletedTask"("userId");

-- CreateIndex
CREATE INDEX "Task_userId_idx" ON "Task"("userId");

-- CreateIndex
CREATE INDEX "TimeRecord_userId_idx" ON "TimeRecord"("userId");

-- CreateIndex
CREATE INDEX "UserInfo_userId_idx" ON "UserInfo"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInfo_userId_key" ON "UserInfo"("userId");

-- CreateIndex
CREATE INDEX "WeeklyPlanEntry_userId_idx" ON "WeeklyPlanEntry"("userId");
