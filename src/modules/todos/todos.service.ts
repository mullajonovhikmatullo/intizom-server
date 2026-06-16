import { TodoPriority } from "../../../generated/prisma/enums.js";
import { toDateKey, toDateOnly } from "../../lib/date.js";
import { HttpError } from "../../lib/http-error.js";
import { toPagination } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import type {
  CreateTodoInput,
  DoneTodoInput,
  ListTodosQuery,
  UpdateTodoInput,
} from "./todos.validation.js";

const todoSelect = {
  id: true,
  title: true,
  note: true,
  priority: true,
  dueDate: true,
  isDone: true,
  createdAt: true,
  completedAt: true,
} as const;

type TodoRecord = {
  id: string;
  title: string;
  note: string | null;
  priority: TodoPriority;
  dueDate: Date | null;
  isDone: boolean;
  createdAt: Date;
  completedAt: Date | null;
};

const toPublicTodo = (todo: TodoRecord) => ({
  id: todo.id,
  title: todo.title,
  note: todo.note ?? undefined,
  priority: todo.priority,
  dueDate: todo.dueDate ? toDateKey(todo.dueDate) : undefined,
  isDone: todo.isDone,
  createdAt: todo.createdAt,
  completedAt: todo.completedAt ?? undefined,
});

const buildTodoWhere = (userId: string, query: ListTodosQuery) => ({
  userId,
  ...(typeof query.isDone === "boolean" ? { isDone: query.isDone } : {}),
  ...(query.priority ? { priority: query.priority as TodoPriority } : {}),
  ...(query.dueFrom || query.dueTo
    ? {
        dueDate: {
          ...(query.dueFrom ? { gte: toDateOnly(query.dueFrom) } : {}),
          ...(query.dueTo ? { lte: toDateOnly(query.dueTo) } : {}),
        },
      }
    : {}),
});

const findUserTodo = async (userId: string, todoId: string) => {
  const todo = await prisma.todo.findFirst({ where: { id: todoId, userId } });
  if (!todo) throw new HttpError(404, "TODO_NOT_FOUND", "Todo not found");
  return todo;
};

export const listTodos = async (userId: string, query: ListTodosQuery) => {
  const where = buildTodoWhere(userId, query);
  const [todos, total] = await Promise.all([
    prisma.todo.findMany({
      where,
      select: todoSelect,
      orderBy: [{ isDone: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      ...toPagination(query),
    }),
    prisma.todo.count({ where }),
  ]);

  return { data: todos.map(toPublicTodo), meta: { total, page: query.page, limit: query.limit } };
};

export const getTodo = async (userId: string, todoId: string) => {
  const todo = await prisma.todo.findFirst({ where: { id: todoId, userId }, select: todoSelect });
  if (!todo) throw new HttpError(404, "TODO_NOT_FOUND", "Todo not found");
  return toPublicTodo(todo);
};

export const createTodo = async (userId: string, input: CreateTodoInput) => {
  const todo = await prisma.todo.create({
    data: {
      userId,
      title: input.title,
      note: input.note || null,
      priority: input.priority,
      dueDate: input.dueDate ? toDateOnly(input.dueDate) : null,
    },
    select: todoSelect,
  });
  return toPublicTodo(todo);
};

export const updateTodo = async (userId: string, todoId: string, input: UpdateTodoInput) => {
  const todo = await findUserTodo(userId, todoId);
  const updated = await prisma.todo.update({
    where: { id: todo.id },
    data: {
      ...input,
      note: input.note === undefined ? undefined : input.note || null,
      dueDate:
        input.dueDate === undefined ? undefined : input.dueDate ? toDateOnly(input.dueDate) : null,
    },
    select: todoSelect,
  });
  return toPublicTodo(updated);
};

export const deleteTodo = async (userId: string, todoId: string) => {
  const todo = await findUserTodo(userId, todoId);
  await prisma.todo.delete({ where: { id: todo.id } });
};

export const setTodoDone = async (userId: string, todoId: string, input: DoneTodoInput) => {
  const todo = await findUserTodo(userId, todoId);
  const updated = await prisma.todo.update({
    where: { id: todo.id },
    data: {
      isDone: input.isDone,
      completedAt: input.isDone ? new Date() : null,
    },
    select: todoSelect,
  });
  return toPublicTodo(updated);
};

export const getTodoSummary = async (userId: string) => {
  const [active, done] = await Promise.all([
    prisma.todo.count({ where: { userId, isDone: false } }),
    prisma.todo.count({ where: { userId, isDone: true } }),
  ]);
  return { active, done, total: active + done };
};
