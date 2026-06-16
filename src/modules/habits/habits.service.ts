import { HabitType } from "../../../generated/prisma/enums.js";
import { addDays, todayKey, toDateKey, toDateOnly } from "../../lib/date.js";
import { HttpError } from "../../lib/http-error.js";
import { toPagination } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import type {
  CreateHabitInput,
  ListHabitLogsQuery,
  ListHabitsQuery,
  PinHabitInput,
  SetHabitLogInput,
  UpdateHabitInput,
} from "./habits.validation.js";

const habitSelect = {
  id: true,
  title: true,
  time: true,
  type: true,
  createdAt: true,
  targetDays: true,
  pinned: true,
} as const;

type PublicHabitRecord = {
  id: string;
  title: string;
  time: string | null;
  type: HabitType;
  createdAt: Date;
  targetDays: number;
  pinned: boolean;
};

const assertNotFutureDate = (date: string) => {
  if (date > todayKey()) {
    throw new HttpError(422, "FUTURE_DATE_NOT_ALLOWED", "Future dates are not allowed", {
      field: "date",
      reason: "future dates are not allowed",
    });
  }
};

const toPublicHabit = (habit: PublicHabitRecord) => ({
  id: habit.id,
  title: habit.title,
  time: habit.time ?? undefined,
  type: habit.type,
  createdAt: habit.createdAt,
  targetDays: habit.targetDays,
  pinned: habit.pinned,
});

const findUserHabit = async (userId: string, habitId: string) => {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });

  if (!habit) {
    throw new HttpError(404, "HABIT_NOT_FOUND", "Habit not found");
  }

  return habit;
};

export const listHabits = async (userId: string, query: ListHabitsQuery) => {
  const where = {
    userId,
    ...(query.type ? { type: query.type as HabitType } : {}),
  };

  const [habits, total] = await Promise.all([
    prisma.habit.findMany({
      where,
      select: habitSelect,
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      ...toPagination(query),
    }),
    prisma.habit.count({ where }),
  ]);

  return {
    data: habits.map(toPublicHabit),
    meta: { total, page: query.page, limit: query.limit },
  };
};

export const listHabitLogs = async (userId: string, query: ListHabitLogsQuery) => {
  const where = {
    habit: { userId },
    ...(query.habitId ? { habitId: query.habitId } : {}),
    ...(query.from || query.to
      ? {
          date: {
            ...(query.from ? { gte: toDateOnly(query.from) } : {}),
            ...(query.to ? { lte: toDateOnly(query.to) } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.habitLog.findMany({
      where,
      select: { habitId: true, date: true, completed: true },
      orderBy: [{ date: "desc" }, { habitId: "asc" }],
    }),
    prisma.habitLog.count({ where }),
  ]);

  return {
    data: logs.map((log) => ({
      habitId: log.habitId,
      date: toDateKey(log.date),
      completed: log.completed,
    })),
    meta: { total },
  };
};

export const getHabit = async (userId: string, habitId: string) => {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    select: habitSelect,
  });

  if (!habit) {
    throw new HttpError(404, "HABIT_NOT_FOUND", "Habit not found");
  }

  return toPublicHabit(habit);
};

export const createHabit = async (userId: string, input: CreateHabitInput) => {
  const habit = await prisma.habit.create({
    data: {
      userId,
      title: input.title,
      time: input.time,
      type: input.type,
      targetDays: input.targetDays,
    },
    select: habitSelect,
  });

  return toPublicHabit(habit);
};

export const updateHabit = async (userId: string, habitId: string, input: UpdateHabitInput) => {
  const habit = await findUserHabit(userId, habitId);

  if (habit.pinned) {
    throw new HttpError(409, "PINNED_HABIT_LOCKED", "Pinned habit cannot be edited");
  }

  const updated = await prisma.habit.update({
    where: { id: habit.id },
    data: {
      ...input,
      time: input.time === null ? null : input.time,
    },
    select: habitSelect,
  });

  return toPublicHabit(updated);
};

export const deleteHabit = async (userId: string, habitId: string) => {
  const habit = await findUserHabit(userId, habitId);

  if (habit.pinned) {
    throw new HttpError(409, "PINNED_HABIT_LOCKED", "Pinned habit cannot be deleted");
  }

  await prisma.habit.delete({ where: { id: habit.id } });
};

export const pinHabit = async (userId: string, habitId: string, input: PinHabitInput) => {
  const habit = await findUserHabit(userId, habitId);
  const updated = await prisma.habit.update({
    where: { id: habit.id },
    data: { pinned: input.pinned },
    select: habitSelect,
  });

  return toPublicHabit(updated);
};

export const setHabitLog = async (
  userId: string,
  habitId: string,
  date: string,
  input: SetHabitLogInput,
) => {
  assertNotFutureDate(date);
  const habit = await findUserHabit(userId, habitId);
  const dateValue = toDateOnly(date);

  const log = await prisma.habitLog.upsert({
    where: {
      habitId_date: {
        habitId: habit.id,
        date: dateValue,
      },
    },
    create: {
      habitId: habit.id,
      date: dateValue,
      completed: input.completed,
    },
    update: {
      completed: input.completed,
    },
    select: { habitId: true, date: true, completed: true },
  });

  return {
    habitId: log.habitId,
    date: toDateKey(log.date),
    completed: log.completed,
  };
};

export const deleteHabitLog = async (userId: string, habitId: string, date: string) => {
  assertNotFutureDate(date);
  const habit = await findUserHabit(userId, habitId);

  await prisma.habitLog.deleteMany({
    where: {
      habitId: habit.id,
      date: toDateOnly(date),
    },
  });
};

export const getHabitStats = async (userId: string) => {
  const today = todayKey();
  const statsFrom = addDays(toDateOnly(today), -3650);
  const habits = await prisma.habit.findMany({
    where: { userId },
    select: {
      id: true,
      type: true,
      pinned: true,
      createdAt: true,
      logs: {
        where: { date: { gte: statsFrom } },
        select: { date: true, completed: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const logsByHabit = new Map(
    habits.map((habit) => [
      habit.id,
      new Map(habit.logs.map((log) => [toDateKey(log.date), log.completed])),
    ]),
  );

  const completionForDate = (date: string) => {
    const active = habits.filter((habit) => toDateKey(habit.createdAt) <= date);
    if (active.length === 0) return 0;

    const done = active.reduce((count, habit) => {
      const completed = logsByHabit.get(habit.id)?.get(date) ?? false;
      const success = habit.type === HabitType.good ? completed : !completed;
      return count + (success ? 1 : 0);
    }, 0);

    return Math.round((done / active.length) * 100);
  };

  const weekDates = Array.from({ length: 7 }, (_, index) =>
    toDateKey(addDays(toDateOnly(today), index - 6)),
  );
  const weekPct = Math.round(
    weekDates.reduce((sum, date) => sum + completionForDate(date), 0) / weekDates.length,
  );

  let streak = 0;
  let cursor = toDateOnly(today);
  for (let i = 0; i < 3650; i += 1) {
    const date = toDateKey(cursor);
    const pct = completionForDate(date);

    if (pct === 100) {
      streak += 1;
      cursor = addDays(cursor, -1);
      continue;
    }

    if (streak === 0 && date === today) {
      cursor = addDays(cursor, -1);
      continue;
    }

    break;
  }

  return {
    total: habits.length,
    good: habits.filter((habit) => habit.type === HabitType.good).length,
    bad: habits.filter((habit) => habit.type === HabitType.bad).length,
    pinned: habits.filter((habit) => habit.pinned).length,
    todayPct: completionForDate(today),
    weekPct,
    streak,
  };
};
