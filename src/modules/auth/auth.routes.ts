import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { authRateLimit } from "../../middleware/rate-limit.js";
import { validateBody } from "../../middleware/validate-request.js";
import { login, register, updateProfile } from "./auth.service.js";
import { loginSchema, registerSchema, updateProfileSchema } from "./auth.validation.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimit,
  validateBody(registerSchema),
  async (req, res, next) => {
    try {
      const data = await register(req.body);
      res.status(201).json({ data });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post("/login", authRateLimit, validateBody(loginSchema), async (req, res, next) => {
  try {
    const data = await login(req.body);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ data: req.user });
});

authRouter.patch("/me", requireAuth, validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const data = await updateProfile(req.user!.id, req.body);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
});
