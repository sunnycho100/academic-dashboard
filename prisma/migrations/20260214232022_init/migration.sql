-- CreateTable
CREATE TABLE "CompletedTask" (
    "id" TEXT NOT NULL,
    "taskTitle" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "categoryColor" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualTimeSpent" INTEGER,
    "estimatedDuration" INTEGER,
    "timeDifference" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompletedTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompletedTask_completedAt_idx" ON "CompletedTask"("completedAt");

-- CreateIndex
CREATE INDEX "CompletedTask_categoryName_idx" ON "CompletedTask"("categoryName");

-- CreateIndex
CREATE INDEX "CompletedTask_taskType_idx" ON "CompletedTask"("taskType");
