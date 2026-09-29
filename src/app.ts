import cors, { type CorsOptionsDelegate } from "cors";
import express, { type Request } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { apiRateLimit } from "./middleware/rate-limit.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { debtsRouter } from "./modules/debts/debts.routes.js";
import { expensesRouter } from "./modules/expenses/expenses.routes.js";
import { habitsRouter } from "./modules/habits/habits.routes.js";
import { loansRouter } from "./modules/loans/loans.routes.js";
import { todosRouter } from "./modules/todos/todos.routes.js";

export const createApp = () => {
  const app = express();
  const allowDevOrigin = (origin: string) =>
    !env.isProduction && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  const corsOptions: CorsOptionsDelegate<Request> = (req, callback) => {
    const origin = req.header("Origin");
    const isAllowedOrigin =
      !origin || env.corsOrigins.includes(origin) || allowDevOrigin(origin);

    if (!isAllowedOrigin) {
      callback(new Error("Not allowed by CORS"));
      return;
    }

    callback(null, {
      origin: true,
      credentials: true,
    });
  };

  app.disable("x-powered-by");
  if (env.isProduction) {
    // Behind the web container's nginx, which forwards the real client IP.
    app.set("trust proxy", 1);
  }
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({
      data: {
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use("/api/v1", apiRateLimit);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/habits", habitsRouter);
  app.use("/api/v1/expenses", expensesRouter);
  app.use("/api/v1/debts", debtsRouter);
  app.use("/api/v1/loans", loansRouter);
  app.use("/api/v1/todos", todosRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
