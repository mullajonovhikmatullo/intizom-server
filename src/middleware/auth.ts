import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

export const requireAuth: RequestHandler = async (req, res, next) => {
  const authHeader = req.header("authorization");
  const [scheme, token] = authHeader?.trim().split(/\s+/) ?? [];

  if (scheme !== "Bearer" || !token) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Bearer token is required",
      },
    });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "User not found",
        },
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    const code = error instanceof jwt.TokenExpiredError ? "TOKEN_EXPIRED" : "INVALID_TOKEN";
    res.status(401).json({
      error: {
        code,
        message: "Invalid or expired token",
      },
    });
  }
};
