import { ExpenseCategory } from "../../../generated/prisma/enums.js";
import { todayKey, toDateKey, toDateOnly } from "../../lib/date.js";
import { HttpError } from "../../lib/http-error.js";
import { toPagination } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import type {
  CreateExpenseInput,
  ExpenseSummaryQuery,
  ListExpensesQuery,
  UpdateExpenseInput,
} from "./expenses.validation.js";

const expenseSelect = {
  id: true,
  title: true,
  amount: true,
  currency: true,
  category: true,
  date: true,
  createdAt: true,
} as const;

type ExpenseRecord = {
  id: string;
  title: string;
  amount: { toNumber(): number };
  currency: string;
  category: ExpenseCategory;
  date: Date;
  createdAt: Date;
};

const assertNotFutureDate = (date: string) => {
  if (date > todayKey()) {
    throw new HttpError(422, "FUTURE_DATE_NOT_ALLOWED", "Future dates are not allowed", {
      field: "date",
      reason: "future dates are not allowed",
    });
  }
};

const toPublicExpense = (expense: ExpenseRecord) => ({
  id: expense.id,
  title: expense.title,
  amount: expense.amount.toNumber(),
  currency: expense.currency,
  category: expense.category,
  date: toDateKey(expense.date),
  createdAt: expense.createdAt,
});

const buildExpenseWhere = (userId: string, query: ListExpensesQuery | ExpenseSummaryQuery) => {
  const dateFilter =
    "date" in query && query.date
      ? { date: toDateOnly(query.date) }
      : {
          ...(query.from || query.to
            ? {
                date: {
                  ...(query.from ? { gte: toDateOnly(query.from) } : {}),
                  ...(query.to ? { lte: toDateOnly(query.to) } : {}),
                },
              }
            : {}),
        };

  return {
    userId,
    ...(query.category ? { category: query.category as ExpenseCategory } : {}),
    ...dateFilter,
  };
};

const findUserExpense = async (userId: string, expenseId: string) => {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, userId },
  });

  if (!expense) {
    throw new HttpError(404, "EXPENSE_NOT_FOUND", "Expense not found");
  }

  return expense;
};

export const listExpenses = async (userId: string, query: ListExpensesQuery) => {
  const where = buildExpenseWhere(userId, query);

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      select: expenseSelect,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      ...toPagination(query),
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    data: expenses.map(toPublicExpense),
    meta: { total, page: query.page, limit: query.limit },
  };
};

export const getExpense = async (userId: string, expenseId: string) => {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, userId },
    select: expenseSelect,
  });

  if (!expense) {
    throw new HttpError(404, "EXPENSE_NOT_FOUND", "Expense not found");
  }

  return toPublicExpense(expense);
};

export const createExpense = async (userId: string, input: CreateExpenseInput) => {
  assertNotFutureDate(input.date);

  const expense = await prisma.expense.create({
    data: {
      userId,
      title: input.title,
      amount: input.amount,
      currency: input.currency,
      category: input.category,
      date: toDateOnly(input.date),
    },
    select: expenseSelect,
  });

  return toPublicExpense(expense);
};

export const updateExpense = async (
  userId: string,
  expenseId: string,
  input: UpdateExpenseInput,
) => {
  const expense = await findUserExpense(userId, expenseId);

  if (input.date) {
    assertNotFutureDate(input.date);
  }

  const updated = await prisma.expense.update({
    where: { id: expense.id },
    data: {
      ...input,
      ...(input.date ? { date: toDateOnly(input.date) } : {}),
    },
    select: expenseSelect,
  });

  return toPublicExpense(updated);
};

export const deleteExpense = async (userId: string, expenseId: string) => {
  const expense = await findUserExpense(userId, expenseId);
  await prisma.expense.delete({ where: { id: expense.id } });
};

export const getExpenseSummary = async (userId: string, query: ExpenseSummaryQuery) => {
  const where = buildExpenseWhere(userId, query);

  const [count, byCurrencyRows, byCategoryRows, byCategoryCurrencyRows] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.groupBy({
      by: ["currency"],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.expense.groupBy({
      by: ["category", "currency"],
      where,
      _sum: { amount: true },
    }),
  ]);

  return {
    count,
    byCurrency: byCurrencyRows.map((row) => ({
      currency: row.currency,
      total: row._sum.amount?.toNumber() ?? 0,
      count: row._count._all,
    })),
    byCategory: byCategoryRows.map((row) => ({
      category: row.category,
      total: row._sum.amount?.toNumber() ?? 0,
      count: row._count._all,
      byCurrency: byCategoryCurrencyRows
        .filter((currencyRow) => currencyRow.category === row.category)
        .map((currencyRow) => ({
          currency: currencyRow.currency,
          total: currencyRow._sum.amount?.toNumber() ?? 0,
        })),
    })),
  };
};
