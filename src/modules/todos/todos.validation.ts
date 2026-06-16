import { z } from "zod";
import { isValidDateKey } from "../../lib/date.js";
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from "../../lib/pagination.js";

const dateSchema = z.string().refine(isValidDateKey, "Date must be a valid YYYY-MM-DD date");
const prioritySchema = z.enum(["low", "medium", "high"]);
const booleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true");

export const todoIdParamsSchema = z.object({
  todoId: z.string().min(1, "Todo id is required"),
});

export const listTodosQuerySchema = z
  .object({
    isDone: booleanQuerySchema.optional(),
    priority: prioritySchema.optional(),
    dueFrom: dateSchema.optional(),
    dueTo: dateSchema.optional(),
    page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  })
  .refine((value) => !(value.dueFrom && value.dueTo) || value.dueFrom <= value.dueTo, {
    message: "dueFrom must be before or equal to dueTo",
    path: ["dueFrom"],
  });

export const createTodoSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(180, "Title is too long"),
  note: z.string().trim().max(1000).optional(),
  priority: prioritySchema.default("medium"),
  dueDate: dateSchema.optional(),
});

export const updateTodoSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(180, "Title is too long").optional(),
    note: z.string().trim().max(1000).nullable().optional(),
    priority: prioritySchema.optional(),
    dueDate: dateSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const doneTodoSchema = z.object({
  isDone: z.boolean(),
});

export type ListTodosQuery = z.infer<typeof listTodosQuerySchema>;
export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type DoneTodoInput = z.infer<typeof doneTodoSchema>;
