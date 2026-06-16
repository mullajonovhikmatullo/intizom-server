import { z } from "zod";
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from "../../lib/pagination.js";
import { isValidDateKey } from "../../lib/date.js";

const dateSchema = z.string().refine(isValidDateKey, "Date must be a valid YYYY-MM-DD date");
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm")
  .optional();

export const habitIdParamsSchema = z.object({
  habitId: z.string().min(1, "Habit id is required"),
});

export const habitLogParamsSchema = habitIdParamsSchema.extend({
  date: dateSchema,
});

export const listHabitLogsQuerySchema = z
  .object({
    habitId: z.string().min(1).optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  })
  .refine((value) => !(value.from && value.to) || value.from <= value.to, {
    message: "from must be before or equal to to",
    path: ["from"],
  });

export const listHabitsQuerySchema = z.object({
  type: z.enum(["good", "bad"]).optional(),
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export const createHabitSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160, "Title is too long"),
  time: timeSchema,
  type: z.enum(["good", "bad"]),
  targetDays: z.coerce.number().int().min(1).max(3650),
});

export const updateHabitSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(160, "Title is too long").optional(),
    time: timeSchema.nullable().optional(),
    type: z.enum(["good", "bad"]).optional(),
    targetDays: z.coerce.number().int().min(1).max(3650).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const pinHabitSchema = z.object({
  pinned: z.boolean(),
});

export const setHabitLogSchema = z.object({
  completed: z.boolean().default(true),
});

export type ListHabitsQuery = z.infer<typeof listHabitsQuerySchema>;
export type ListHabitLogsQuery = z.infer<typeof listHabitLogsQuerySchema>;
export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
export type PinHabitInput = z.infer<typeof pinHabitSchema>;
export type SetHabitLogInput = z.infer<typeof setHabitLogSchema>;
