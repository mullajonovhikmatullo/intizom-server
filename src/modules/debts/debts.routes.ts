import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate-request.js";
import {
  addDebtPayment,
  createDebt,
  deleteDebt,
  getDebt,
  listDebts,
  setDebtPaid,
  updateDebt,
} from "./debts.service.js";
import {
  createDebtPaymentSchema,
  createDebtSchema,
  debtIdParamsSchema,
  listDebtsQuerySchema,
  setDebtPaidSchema,
  updateDebtSchema,
} from "./debts.validation.js";

export const debtsRouter = Router();

debtsRouter.use(requireAuth);

debtsRouter.get("/", validateQuery(listDebtsQuerySchema), async (req, res, next) => {
  try {
    const data = await listDebts(req.user!.id, req.query);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

debtsRouter.post("/", validateBody(createDebtSchema), async (req, res, next) => {
  try {
    const data = await createDebt(req.user!.id, req.body);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

debtsRouter.get("/:debtId", validateParams(debtIdParamsSchema), async (req, res, next) => {
  try {
    const { debtId } = req.params as { debtId: string };
    const data = await getDebt(req.user!.id, debtId);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
});

debtsRouter.patch(
  "/:debtId",
  validateParams(debtIdParamsSchema),
  validateBody(updateDebtSchema),
  async (req, res, next) => {
    try {
      const { debtId } = req.params as { debtId: string };
      const data = await updateDebt(req.user!.id, debtId, req.body);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },
);

debtsRouter.delete("/:debtId", validateParams(debtIdParamsSchema), async (req, res, next) => {
  try {
    const { debtId } = req.params as { debtId: string };
    await deleteDebt(req.user!.id, debtId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

debtsRouter.patch(
  "/:debtId/paid",
  validateParams(debtIdParamsSchema),
  validateBody(setDebtPaidSchema),
  async (req, res, next) => {
    try {
      const { debtId } = req.params as { debtId: string };
      const data = await setDebtPaid(req.user!.id, debtId, req.body);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },
);

debtsRouter.post(
  "/:debtId/payments",
  validateParams(debtIdParamsSchema),
  validateBody(createDebtPaymentSchema),
  async (req, res, next) => {
    try {
      const { debtId } = req.params as { debtId: string };
      const data = await addDebtPayment(req.user!.id, debtId, req.body);
      res.status(201).json({ data });
    } catch (error) {
      next(error);
    }
  },
);
