import { z } from "zod";
import { isValidDateKey } from "../../lib/date.js";

const dateSchema = z.string().refine(isValidDateKey, "Date must be a valid YYYY-MM-DD date");
const amountSchema = z.coerce.number().positive("Amount must be greater than 0").max(9999999999.99);
const currencySchema = z.enum([" so'm", "$"]);
const directionSchema = z.enum(["borrowed", "lent"]);
const booleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true");

export const debtIdParamsSchema = z.object({
  debtId: z.string().min(1, "Debt id is required"),
});

export const listDebtsQuerySchema = z.object({
  direction: directionSchema.optional(),
  isPaid: booleanQuerySchema.optional(),
});

export const createDebtSchema = z.object({
  direction: directionSchema,
  person: z.string().trim().min(1, "Person is required").max(160, "Person is too long"),
  amount: amountSchema,
  currency: currencySchema,
  dueDate: dateSchema.optional(),
  note: z.string().trim().max(1000).optional(),
});

export const updateDebtSchema = z
  .object({
    direction: directionSchema.optional(),
    person: z.string().trim().min(1, "Person is required").max(160, "Person is too long").optional(),
    amount: amountSchema.optional(),
    currency: currencySchema.optional(),
    dueDate: dateSchema.nullable().optional(),
    note: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const setDebtPaidSchema = z.object({
  isPaid: z.boolean(),
});

export const createDebtPaymentSchema = z.object({
  amount: amountSchema,
  date: dateSchema,
  note: z.string().trim().max(1000).optional(),
});

export type ListDebtsQuery = z.infer<typeof listDebtsQuerySchema>;
export type CreateDebtInput = z.infer<typeof createDebtSchema>;
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>;
export type SetDebtPaidInput = z.infer<typeof setDebtPaidSchema>;
export type CreateDebtPaymentInput = z.infer<typeof createDebtPaymentSchema>;
