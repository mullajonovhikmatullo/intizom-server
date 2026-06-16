import { Prisma } from "../../../generated/prisma/client.js";
import { todayKey, toDateKey, toDateOnly } from "../../lib/date.js";
import { HttpError } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import type {
  CreateLoanInput,
  ListLoansQuery,
  SetLoanInstallmentInput,
  UpdateLoanInput,
} from "./loans.validation.js";

const loanInstallmentSelect = {
  id: true,
  index: true,
  dueDate: true,
  paid: true,
  paidDate: true,
} as const;

const loanInstallmentsOrderBy: Prisma.LoanInstallmentOrderByWithRelationInput[] = [
  { index: "asc" },
];

const loanSelect = {
  id: true,
  title: true,
  totalMonths: true,
  monthlyPayment: true,
  paymentDay: true,
  currency: true,
  startDate: true,
  note: true,
  createdAt: true,
  installments: {
    select: loanInstallmentSelect,
    orderBy: loanInstallmentsOrderBy,
  },
};

type LoanRecord = {
  id: string;
  title: string;
  totalMonths: number;
  monthlyPayment: { toNumber(): number };
  paymentDay: number;
  currency: string;
  startDate: Date;
  note: string | null;
  createdAt: Date;
  installments: Array<{
    id: string;
    index: number;
    dueDate: Date;
    paid: boolean;
    paidDate: Date | null;
  }>;
};

type LoanInstallmentRecord = LoanRecord["installments"][number];

const daysInMonth = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

const buildInstallmentDueDate = (startDate: string, offset: number, paymentDay: number) => {
  const base = toDateOnly(startDate);
  const year = base.getUTCFullYear();
  const monthIndex = base.getUTCMonth() + offset;
  const day = Math.min(paymentDay, daysInMonth(year, monthIndex));
  return toDateKey(new Date(Date.UTC(year, monthIndex, day)));
};

const buildInstallments = (
  startDate: string,
  totalMonths: number,
  paymentDay: number,
  prior?: LoanInstallmentRecord[],
) => {
  const priorByIndex = new Map(prior?.map((item) => [item.index, item]) ?? []);

  return Array.from({ length: totalMonths }, (_, idx) => {
    const index = idx + 1;
    const existing = priorByIndex.get(index);
    return {
      id: existing?.id ?? crypto.randomUUID(),
      index,
      dueDate: buildInstallmentDueDate(startDate, idx, paymentDay),
      paid: existing?.paid ?? false,
      paidDate: existing?.paidDate ? toDateKey(existing.paidDate) : undefined,
    };
  });
};

const toPublicLoan = (loan: LoanRecord) => ({
  id: loan.id,
  title: loan.title,
  totalMonths: loan.totalMonths,
  monthlyPayment: loan.monthlyPayment.toNumber(),
  paymentDay: loan.paymentDay,
  currency: loan.currency,
  startDate: toDateKey(loan.startDate),
  note: loan.note ?? undefined,
  createdAt: loan.createdAt,
  installments: loan.installments.map((installment) => ({
    id: installment.id,
    index: installment.index,
    dueDate: toDateKey(installment.dueDate),
    paid: installment.paid,
    paidDate: installment.paidDate ? toDateKey(installment.paidDate) : undefined,
  })),
});

const findUserLoan = async (userId: string, loanId: string) => {
  const loan = await prisma.loan.findFirst({
    where: { id: loanId, userId },
    select: loanSelect,
  });

  if (!loan) {
    throw new HttpError(404, "LOAN_NOT_FOUND", "Loan not found");
  }

  return loan as LoanRecord;
};

const loanWhere = (userId: string, query: ListLoansQuery) => ({
  userId,
  ...(query.status === "active"
    ? { installments: { some: { paid: false } } }
    : query.status === "finished"
      ? { installments: { every: { paid: true } } }
      : {}),
});

export const listLoans = async (userId: string, query: ListLoansQuery) => {
  const where = loanWhere(userId, query);

  const [loans, total] = await Promise.all([
    prisma.loan.findMany({
      where,
      select: loanSelect,
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.loan.count({ where }),
  ]);

  return {
    data: (loans as LoanRecord[]).map(toPublicLoan),
    meta: { total },
  };
};

export const getLoan = async (userId: string, loanId: string) => {
  const loan = await findUserLoan(userId, loanId);
  return toPublicLoan(loan as LoanRecord);
};

export const createLoan = async (userId: string, input: CreateLoanInput) => {
  const installments = buildInstallments(input.startDate, input.totalMonths, input.paymentDay);

  const loan = await prisma.loan.create({
    data: {
      userId,
      title: input.title,
      totalMonths: input.totalMonths,
      monthlyPayment: input.monthlyPayment,
      paymentDay: input.paymentDay,
      currency: input.currency,
      startDate: toDateOnly(input.startDate),
      note: input.note?.trim() || null,
      installments: {
        create: installments.map((installment) => ({
          id: installment.id,
          index: installment.index,
          dueDate: toDateOnly(installment.dueDate),
          paid: installment.paid,
          paidDate: installment.paidDate ? toDateOnly(installment.paidDate) : null,
        })),
      },
    },
    select: loanSelect,
  });

  return toPublicLoan(loan as LoanRecord);
};

export const updateLoan = async (userId: string, loanId: string, input: UpdateLoanInput) => {
  const loan = await findUserLoan(userId, loanId);
  const nextStartDate = input.startDate ?? toDateKey(loan.startDate);
  const nextTotalMonths = input.totalMonths ?? loan.totalMonths;
  const nextPaymentDay = input.paymentDay ?? loan.paymentDay;
  const installments = buildInstallments(nextStartDate, nextTotalMonths, nextPaymentDay, loan.installments);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.loan.update({
      where: { id: loan.id },
      data: {
        ...(input.title ? { title: input.title } : {}),
        ...(input.totalMonths !== undefined ? { totalMonths: input.totalMonths } : {}),
        ...(input.monthlyPayment !== undefined ? { monthlyPayment: input.monthlyPayment } : {}),
        ...(input.paymentDay !== undefined ? { paymentDay: input.paymentDay } : {}),
        ...(input.currency ? { currency: input.currency } : {}),
        ...(input.startDate ? { startDate: toDateOnly(input.startDate) } : {}),
        ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
      },
    });

    await tx.loanInstallment.deleteMany({ where: { loanId: loan.id } });

    await tx.loanInstallment.createMany({
      data: installments.map((installment) => ({
        id: installment.id,
        loanId: loan.id,
        index: installment.index,
        dueDate: toDateOnly(installment.dueDate),
        paid: installment.paid,
        paidDate: installment.paidDate ? toDateOnly(installment.paidDate) : null,
      })),
    });

    return tx.loan.findFirst({
      where: { id: loan.id },
      select: loanSelect,
    });
  });

  if (!updated) {
    throw new HttpError(404, "LOAN_NOT_FOUND", "Loan not found");
  }

  return toPublicLoan(updated as LoanRecord);
};

export const deleteLoan = async (userId: string, loanId: string) => {
  const loan = await findUserLoan(userId, loanId);
  await prisma.loan.delete({ where: { id: loan.id } });
};

export const setLoanInstallment = async (
  userId: string,
  installmentId: string,
  input: SetLoanInstallmentInput,
) => {
  const installment = await prisma.loanInstallment.findFirst({
    where: { id: installmentId },
    select: {
      id: true,
      paid: true,
      loan: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!installment || installment.loan.userId !== userId) {
    throw new HttpError(404, "INSTALLMENT_NOT_FOUND", "Installment not found");
  }

  const updated = await prisma.loanInstallment.update({
    where: { id: installment.id },
    data: {
      paid: input.paid,
      paidDate: input.paid ? toDateOnly(input.paidDate ?? todayKey()) : null,
    },
    select: loanInstallmentSelect,
  });

  return {
    id: updated.id,
    index: updated.index,
    dueDate: toDateKey(updated.dueDate),
    paid: updated.paid,
    paidDate: updated.paidDate ? toDateKey(updated.paidDate) : undefined,
  };
};
