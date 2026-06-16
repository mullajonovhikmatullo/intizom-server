import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate-request.js";
import {
  createLoan,
  deleteLoan,
  getLoan,
  listLoans,
  setLoanInstallment,
  updateLoan,
} from "./loans.service.js";
import {
  createLoanSchema,
  installmentParamsSchema,
  listLoansQuerySchema,
  loanIdParamsSchema,
  setLoanInstallmentSchema,
  updateLoanSchema,
} from "./loans.validation.js";

export const loansRouter = Router();

loansRouter.use(requireAuth);

loansRouter.get("/", validateQuery(listLoansQuerySchema), async (req, res, next) => {
  try {
    const data = await listLoans(req.user!.id, req.query);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

loansRouter.post("/", validateBody(createLoanSchema), async (req, res, next) => {
  try {
    const data = await createLoan(req.user!.id, req.body);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

loansRouter.get("/:loanId", validateParams(loanIdParamsSchema), async (req, res, next) => {
  try {
    const { loanId } = req.params as { loanId: string };
    const data = await getLoan(req.user!.id, loanId);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
});

loansRouter.patch(
  "/:loanId",
  validateParams(loanIdParamsSchema),
  validateBody(updateLoanSchema),
  async (req, res, next) => {
    try {
      const { loanId } = req.params as { loanId: string };
      const data = await updateLoan(req.user!.id, loanId, req.body);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },
);

loansRouter.delete("/:loanId", validateParams(loanIdParamsSchema), async (req, res, next) => {
  try {
    const { loanId } = req.params as { loanId: string };
    await deleteLoan(req.user!.id, loanId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

loansRouter.patch(
  "/:loanId/installments/:installmentId",
  validateParams(installmentParamsSchema),
  validateBody(setLoanInstallmentSchema),
  async (req, res, next) => {
    try {
      const { installmentId } = req.params as { installmentId: string };
      const data = await setLoanInstallment(req.user!.id, installmentId, req.body);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },
);
