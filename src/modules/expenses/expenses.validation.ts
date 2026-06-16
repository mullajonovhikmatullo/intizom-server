import { z } from "zod";
import { isValidDateKey } from "../../lib/date.js";
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from "../../lib/pagination.js";

const dateSchema = z.string().refine(isValidDateKey, "Date must be a valid YYYY-MM-DD date");
const amountSchema = z.coerce.number().positive("Amount must be greater than 0").max(9999999999.99);
const categorySchema = z.enum([
  "food",
  "transport",
  "shopping",
  "bills",
  "entertainment",
  "health",
  "education",
  "other",
]);
const currencySchema = z.enum([" so'm", "$"]);

export const expenseIdParamsSchema = z.object({
  expenseId: z.string().min(1, "Expense id is required"),
});

export const listExpensesQuerySchema = z
  .object({
    date: dateSchema.optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    category: categorySchema.optional(),
    page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  })
  .refine((value) => !(value.date && (value.from || value.to)), {
    message: "Use either date or date range, not both",
    path: ["date"],
  })
  .refine((value) => !(value.from && value.to) || value.from <= value.to, {
    message: "from must be before or equal to to",
    path: ["from"],
  });

export const expenseSummaryQuerySchema = z
  .object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    category: categorySchema.optional(),
  })
  .refine((value) => !(value.from && value.to) || value.from <= value.to, {
    message: "from must be before or equal to to",
    path: ["from"],
  });

export const createExpenseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160, "Title is too long"),
  amount: amountSchema,
  currency: currencySchema,
  category: categorySchema,
  date: dateSchema,
});

export const updateExpenseSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(160, "Title is too long").optional(),
    amount: amountSchema.optional(),
    currency: currencySchema.optional(),
    category: categorySchema.optional(),
    date: dateSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
export type ExpenseSummaryQuery = z.infer<typeof expenseSummaryQuerySchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
