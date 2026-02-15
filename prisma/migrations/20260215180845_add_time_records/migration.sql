-- CreateTable
CREATE TABLE "TimeRecord" (
    "id" TEXT NOT NULL,
    "taskId" TEXT,
    "taskTitle" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "categoryColor" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeRecord_startTime_idx" ON "TimeRecord"("startTime");

-- CreateIndex
CREATE INDEX "TimeRecord_taskId_idx" ON "TimeRecord"("taskId");
