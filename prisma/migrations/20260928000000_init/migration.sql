-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dueAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priorityOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "estimatedDuration" INTEGER,
    "actualTimeSpent" INTEGER,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompletedTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "taskTitle" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "categoryColor" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "dueAt" DATETIME,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualTimeSpent" INTEGER,
    "estimatedDuration" INTEGER,
    "timeDifference" INTEGER,
    "notes" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TimeRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "taskTitle" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "categoryColor" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WeeklyPlanEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyPlanEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'User',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TimetableEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE INDEX "Task_userId_idx" ON "Task"("userId");

-- CreateIndex
CREATE INDEX "Task_categoryId_idx" ON "Task"("categoryId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");

-- CreateIndex
CREATE INDEX "CompletedTask_userId_idx" ON "CompletedTask"("userId");

-- CreateIndex
CREATE INDEX "CompletedTask_completedAt_idx" ON "CompletedTask"("completedAt");

-- CreateIndex
CREATE INDEX "CompletedTask_categoryName_idx" ON "CompletedTask"("categoryName");

-- CreateIndex
CREATE INDEX "CompletedTask_taskType_idx" ON "CompletedTask"("taskType");

-- CreateIndex
CREATE INDEX "CompletedTask_deletedAt_idx" ON "CompletedTask"("deletedAt");

-- CreateIndex
CREATE INDEX "TimeRecord_userId_idx" ON "TimeRecord"("userId");

-- CreateIndex
CREATE INDEX "TimeRecord_startTime_idx" ON "TimeRecord"("startTime");

-- CreateIndex
CREATE INDEX "TimeRecord_taskId_idx" ON "TimeRecord"("taskId");

-- CreateIndex
CREATE INDEX "WeeklyPlanEntry_userId_idx" ON "WeeklyPlanEntry"("userId");

-- CreateIndex
CREATE INDEX "WeeklyPlanEntry_date_idx" ON "WeeklyPlanEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlanEntry_taskId_date_key" ON "WeeklyPlanEntry"("taskId", "date");

-- CreateIndex
CREATE INDEX "UserInfo_userId_idx" ON "UserInfo"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInfo_userId_key" ON "UserInfo"("userId");

-- CreateIndex
CREATE INDEX "TimetableEntry_userId_idx" ON "TimetableEntry"("userId");

-- CreateIndex
CREATE INDEX "TimetableEntry_date_idx" ON "TimetableEntry"("date");

