import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate-request.js";
import type { ListExpensesQuery } from "./expenses.validation.js";
import {
  createExpense,
  deleteExpense,
  getExpense,
  getExpenseSummary,
  listExpenses,
  updateExpense,
} from "./expenses.service.js";
import {
  createExpenseSchema,
  expenseIdParamsSchema,
  expenseSummaryQuerySchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} from "./expenses.validation.js";

export const expensesRouter = Router();

expensesRouter.use(requireAuth);

expensesRouter.get("/summary", validateQuery(expenseSummaryQuerySchema), async (req, res, next) => {
  try {
    const data = await getExpenseSummary(req.user!.id, req.query);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
});

expensesRouter.get("/", validateQuery(listExpensesQuerySchema), async (req, res, next) => {
  try {
    const result = await listExpenses(req.user!.id, req.query as unknown as ListExpensesQuery);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

expensesRouter.post("/", validateBody(createExpenseSchema), async (req, res, next) => {
  try {
    const data = await createExpense(req.user!.id, req.body);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

expensesRouter.get("/:expenseId", validateParams(expenseIdParamsSchema), async (req, res, next) => {
  try {
    const { expenseId } = req.params as { expenseId: string };
    const data = await getExpense(req.user!.id, expenseId);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
});

expensesRouter.patch(
  "/:expenseId",
  validateParams(expenseIdParamsSchema),
  validateBody(updateExpenseSchema),
  async (req, res, next) => {
    try {
      const { expenseId } = req.params as { expenseId: string };
      const data = await updateExpense(req.user!.id, expenseId, req.body);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },
);

expensesRouter.delete(
  "/:expenseId",
  validateParams(expenseIdParamsSchema),
  async (req, res, next) => {
    try {
      const { expenseId } = req.params as { expenseId: string };
      await deleteExpense(req.user!.id, expenseId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);
