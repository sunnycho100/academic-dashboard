-- AlterTable
ALTER TABLE "CompletedTask" ALTER COLUMN "dueAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "dueAt" DROP NOT NULL;
