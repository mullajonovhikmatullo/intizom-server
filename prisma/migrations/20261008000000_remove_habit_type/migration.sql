-- Bad habits are no longer supported; every habit is now a single kind.
DELETE FROM "Habit" WHERE "type" = 'bad';

-- DropIndex
DROP INDEX "Habit_userId_type_idx";

-- AlterTable
ALTER TABLE "Habit" DROP COLUMN "type";

-- DropEnum
DROP TYPE "HabitType";
