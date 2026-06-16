import { Prisma } from "../../../generated/prisma/client.js";
import { DebtDirection } from "../../../generated/prisma/enums.js";
import { todayKey, toDateKey, toDateOnly } from "../../lib/date.js";
import { HttpError } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import type {
  CreateDebtInput,
  CreateDebtPaymentInput,
  ListDebtsQuery,
  SetDebtPaidInput,
  UpdateDebtInput,
} from "./debts.validation.js";

const debtPaymentSelect = {
  id: true,
  amount: true,
  date: true,
  note: true,
} as const;

const debtPaymentsOrderBy: Prisma.DebtPaymentOrderByWithRelationInput[] = [
  { date: "asc" },
  { createdAt: "asc" },
];

const debtSelect = {
  id: true,
  direction: true,
  person: true,
  amount: true,
  currency: true,
  dueDate: true,
  note: true,
  isPaid: true,
  createdAt: true,
  payments: {
    select: debtPaymentSelect,
    orderBy: debtPaymentsOrderBy,
  },
};

type DebtRecord = {
  id: string;
  direction: DebtDirection;
  person: string;
  amount: { toNumber(): number };
  currency: string;
  dueDate: Date | null;
  note: string | null;
  isPaid: boolean;
  createdAt: Date;
  payments: Array<{
    id: string;
    amount: { toNumber(): number };
    date: Date;
    note: string | null;
  }>;
};

const assertNotPastDate = (date: string) => {
  if (date < todayKey()) {
    throw new HttpError(422, "PAST_DATE_NOT_ALLOWED", "Past dates are not allowed", {
      field: "dueDate",
      reason: "past dates are not allowed",
    });
  }
};

const toPublicDebt = (debt: DebtRecord) => ({
  id: debt.id,
  direction: debt.direction,
  person: debt.person,
  amount: debt.amount.toNumber(),
  currency: debt.currency,
  dueDate: debt.dueDate ? toDateKey(debt.dueDate) : undefined,
  note: debt.note ?? undefined,
  isPaid: debt.isPaid,
  createdAt: debt.createdAt,
  payments: debt.payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount.toNumber(),
    date: toDateKey(payment.date),
    note: payment.note ?? undefined,
  })),
});

const findUserDebt = async (userId: string, debtId: string) => {
  const debt = await prisma.debt.findFirst({
    where: { id: debtId, userId },
    select: debtSelect,
  });

  if (!debt) {
    throw new HttpError(404, "DEBT_NOT_FOUND", "Debt not found");
  }

  return debt as DebtRecord;
};

const debtWhere = (userId: string, query: ListDebtsQuery) => ({
  userId,
  ...(query.direction ? { direction: query.direction } : {}),
  ...(typeof query.isPaid === "boolean" ? { isPaid: query.isPaid } : {}),
});

export const listDebts = async (userId: string, query: ListDebtsQuery) => {
  const where = debtWhere(userId, query);

  const [debts, total] = await Promise.all([
    prisma.debt.findMany({
      where,
      select: debtSelect,
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.debt.count({ where }),
  ]);

  return {
    data: (debts as DebtRecord[]).map(toPublicDebt),
    meta: { total },
  };
};

export const getDebt = async (userId: string, debtId: string) => {
  const debt = await findUserDebt(userId, debtId);
  return toPublicDebt(debt);
};

export const createDebt = async (userId: string, input: CreateDebtInput) => {
  if (input.dueDate) {
    assertNotPastDate(input.dueDate);
  }

  const debt = await prisma.debt.create({
    data: {
      userId,
      direction: input.direction,
      person: input.person,
      amount: input.amount,
      currency: input.currency,
      dueDate: input.dueDate ? toDateOnly(input.dueDate) : null,
      note: input.note?.trim() || null,
    },
    select: debtSelect,
  });

  return toPublicDebt(debt as DebtRecord);
};

export const updateDebt = async (userId: string, debtId: string, input: UpdateDebtInput) => {
  const debt = await findUserDebt(userId, debtId);

  if (input.dueDate) {
    assertNotPastDate(input.dueDate);
  }

  const nextAmount = input.amount ?? debt.amount.toNumber();
  const paidAmount = debt.payments.reduce((sum: number, payment) => sum + payment.amount.toNumber(), 0);
  if (nextAmount < paidAmount) {
    throw new HttpError(422, "DEBT_AMOUNT_TOO_SMALL", "Debt amount cannot be smaller than paid amount", {
      field: "amount",
      reason: "amount cannot be smaller than already paid amount",
    });
  }

  const updated = await prisma.debt.update({
    where: { id: debt.id },
    data: {
      ...(input.direction ? { direction: input.direction } : {}),
      ...(input.person ? { person: input.person } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.dueDate !== undefined
        ? { dueDate: input.dueDate ? toDateOnly(input.dueDate) : null }
        : {}),
      ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
    },
    select: debtSelect,
  });

  return toPublicDebt(updated as DebtRecord);
};

export const deleteDebt = async (userId: string, debtId: string) => {
  const debt = await findUserDebt(userId, debtId);
  await prisma.debt.delete({ where: { id: debt.id } });
};

export const setDebtPaid = async (userId: string, debtId: string, input: SetDebtPaidInput) => {
  const debt = await findUserDebt(userId, debtId);
  const updated = await prisma.debt.update({
    where: { id: debt.id },
    data: { isPaid: input.isPaid },
    select: debtSelect,
  });

  return toPublicDebt(updated as DebtRecord);
};

export const addDebtPayment = async (
  userId: string,
  debtId: string,
  input: CreateDebtPaymentInput,
) => {
  const debt = await findUserDebt(userId, debtId);
  const paidAmount = debt.payments.reduce((sum: number, payment: DebtRecord["payments"][number]) => sum + payment.amount.toNumber(), 0);
  const remaining = debt.amount.toNumber() - paidAmount;

  if (input.amount > remaining) {
    throw new HttpError(422, "PAYMENT_TOO_LARGE", "Payment cannot exceed the remaining debt", {
      field: "amount",
      reason: "amount cannot exceed remaining debt amount",
    });
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.debtPayment.create({
      data: {
        debtId: debt.id,
        amount: input.amount,
        date: toDateOnly(input.date),
        note: input.note?.trim() || null,
      },
      select: debtPaymentSelect,
    });

    const nextPaid = paidAmount + input.amount >= debt.amount.toNumber();
    if (nextPaid !== debt.isPaid) {
      await tx.debt.update({
        where: { id: debt.id },
        data: { isPaid: nextPaid },
      });
    }

    return created;
  });

  const updatedDebt = await findUserDebt(userId, debtId);

  return {
    payment: {
      id: payment.id,
      amount: payment.amount.toNumber(),
      date: toDateKey(payment.date),
      note: payment.note ?? undefined,
    },
    debt: toPublicDebt(updatedDebt),
  };
};
