import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate-request.js";
import type { ListHabitLogsQuery, ListHabitsQuery } from "./habits.validation.js";
import {
  createHabit,
  deleteHabit,
  deleteHabitLog,
  getHabit,
  getHabitStats,
  listHabitLogs,
  listHabits,
  pinHabit,
  setHabitLog,
  updateHabit,
} from "./habits.service.js";
import {
  createHabitSchema,
  habitIdParamsSchema,
  habitLogParamsSchema,
  listHabitLogsQuerySchema,
  listHabitsQuerySchema,
  pinHabitSchema,
  setHabitLogSchema,
  updateHabitSchema,
} from "./habits.validation.js";

export const habitsRouter = Router();

habitsRouter.use(requireAuth);

habitsRouter.get("/stats", async (req, res, next) => {
  try {
    const data = await getHabitStats(req.user!.id);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
});

habitsRouter.get("/logs", validateQuery(listHabitLogsQuerySchema), async (req, res, next) => {
  try {
    const result = await listHabitLogs(req.user!.id, req.query as unknown as ListHabitLogsQuery);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

habitsRouter.get("/", validateQuery(listHabitsQuerySchema), async (req, res, next) => {
  try {
    const result = await listHabits(req.user!.id, req.query as unknown as ListHabitsQuery);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

habitsRouter.post("/", validateBody(createHabitSchema), async (req, res, next) => {
  try {
    const data = await createHabit(req.user!.id, req.body);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

habitsRouter.get("/:habitId", validateParams(habitIdParamsSchema), async (req, res, next) => {
  try {
    const { habitId } = req.params as { habitId: string };
    const data = await getHabit(req.user!.id, habitId);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
});

habitsRouter.patch(
  "/:habitId",
  validateParams(habitIdParamsSchema),
  validateBody(updateHabitSchema),
  async (req, res, next) => {
    try {
      const { habitId } = req.params as { habitId: string };
      const data = await updateHabit(req.user!.id, habitId, req.body);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },
);

habitsRouter.delete("/:habitId", validateParams(habitIdParamsSchema), async (req, res, next) => {
  try {
    const { habitId } = req.params as { habitId: string };
    await deleteHabit(req.user!.id, habitId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

habitsRouter.patch(
  "/:habitId/pin",
  validateParams(habitIdParamsSchema),
  validateBody(pinHabitSchema),
  async (req, res, next) => {
    try {
      const { habitId } = req.params as { habitId: string };
      const data = await pinHabit(req.user!.id, habitId, req.body);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },
);

habitsRouter.put(
  "/:habitId/logs/:date",
  validateParams(habitLogParamsSchema),
  validateBody(setHabitLogSchema),
  async (req, res, next) => {
    try {
      const { habitId, date } = req.params as { habitId: string; date: string };
      const data = await setHabitLog(req.user!.id, habitId, date, req.body);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },
);

habitsRouter.delete(
  "/:habitId/logs/:date",
  validateParams(habitLogParamsSchema),
  async (req, res, next) => {
    try {
      const { habitId, date } = req.params as { habitId: string; date: string };
      await deleteHabitLog(req.user!.id, habitId, date);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);
