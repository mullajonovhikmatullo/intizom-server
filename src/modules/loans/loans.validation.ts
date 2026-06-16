import { z } from "zod";
import { isValidDateKey } from "../../lib/date.js";

const dateSchema = z.string().refine(isValidDateKey, "Date must be a valid YYYY-MM-DD date");
const amountSchema = z.coerce.number().positive("Amount must be greater than 0").max(9999999999.99);
const currencySchema = z.enum([" so'm", "$"]);
const statusSchema = z.enum(["active", "finished"]);

export const loanIdParamsSchema = z.object({
  loanId: z.string().min(1, "Loan id is required"),
});

export const installmentParamsSchema = loanIdParamsSchema.extend({
  installmentId: z.string().min(1, "Installment id is required"),
});

export const listLoansQuerySchema = z.object({
  status: statusSchema.optional(),
});

export const createLoanSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(180, "Title is too long"),
  totalMonths: z.coerce.number().int().min(1).max(120),
  monthlyPayment: amountSchema,
  paymentDay: z.coerce.number().int().min(1).max(31),
  currency: currencySchema,
  startDate: dateSchema,
  note: z.string().trim().max(1000).optional(),
});

export const updateLoanSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(180, "Title is too long").optional(),
    totalMonths: z.coerce.number().int().min(1).max(120).optional(),
    monthlyPayment: amountSchema.optional(),
    paymentDay: z.coerce.number().int().min(1).max(31).optional(),
    currency: currencySchema.optional(),
    startDate: dateSchema.optional(),
    note: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const setLoanInstallmentSchema = z.object({
  paid: z.boolean(),
  paidDate: dateSchema.optional(),
});

export type ListLoansQuery = z.infer<typeof listLoansQuerySchema>;
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>;
export type SetLoanInstallmentInput = z.infer<typeof setLoanInstallmentSchema>;
