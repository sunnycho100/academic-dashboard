-- Remove duplicate segments (same user, start, title and course), keeping the one with
-- the latest end, so the unique index below can be created.
DELETE FROM "TimeRecord" WHERE "id" IN (
    SELECT "id" FROM (
        SELECT "id", ROW_NUMBER() OVER (
            PARTITION BY "userId", "startTime", "taskTitle", "categoryName"
            ORDER BY "endTime" DESC, "createdAt" DESC, "id" DESC
        ) AS "rn"
        FROM "TimeRecord"
    ) WHERE "rn" > 1
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeRecord_userId_startTime_taskTitle_categoryName_key" ON "TimeRecord"("userId", "startTime", "taskTitle", "categoryName");
