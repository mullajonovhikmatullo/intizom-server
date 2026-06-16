import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate-request.js";
import {
  createTodo,
  deleteTodo,
  getTodo,
  getTodoSummary,
  listTodos,
  setTodoDone,
  updateTodo,
} from "./todos.service.js";
import {
  createTodoSchema,
  doneTodoSchema,
  listTodosQuerySchema,
  todoIdParamsSchema,
  updateTodoSchema,
  type ListTodosQuery,
} from "./todos.validation.js";

export const todosRouter = Router();

todosRouter.use(requireAuth);

todosRouter.get("/summary", async (req, res, next) => {
  try {
    const data = await getTodoSummary(req.user!.id);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
});

todosRouter.get("/", validateQuery(listTodosQuerySchema), async (req, res, next) => {
  try {
    const result = await listTodos(req.user!.id, req.query as unknown as ListTodosQuery);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

todosRouter.post("/", validateBody(createTodoSchema), async (req, res, next) => {
  try {
    const data = await createTodo(req.user!.id, req.body);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

todosRouter.get("/:todoId", validateParams(todoIdParamsSchema), async (req, res, next) => {
  try {
    const { todoId } = req.params as { todoId: string };
    const data = await getTodo(req.user!.id, todoId);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
});

todosRouter.patch(
  "/:todoId",
  validateParams(todoIdParamsSchema),
  validateBody(updateTodoSchema),
  async (req, res, next) => {
    try {
      const { todoId } = req.params as { todoId: string };
      const data = await updateTodo(req.user!.id, todoId, req.body);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },
);

todosRouter.delete("/:todoId", validateParams(todoIdParamsSchema), async (req, res, next) => {
  try {
    const { todoId } = req.params as { todoId: string };
    await deleteTodo(req.user!.id, todoId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

todosRouter.patch(
  "/:todoId/done",
  validateParams(todoIdParamsSchema),
  validateBody(doneTodoSchema),
  async (req, res, next) => {
    try {
      const { todoId } = req.params as { todoId: string };
      const data = await setTodoDone(req.user!.id, todoId, req.body);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },
);
