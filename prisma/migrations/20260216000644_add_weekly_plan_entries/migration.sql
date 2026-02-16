-- CreateTable
CREATE TABLE "WeeklyPlanEntry" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyPlanEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyPlanEntry_date_idx" ON "WeeklyPlanEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlanEntry_taskId_date_key" ON "WeeklyPlanEntry"("taskId", "date");

-- AddForeignKey
ALTER TABLE "WeeklyPlanEntry" ADD CONSTRAINT "WeeklyPlanEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
