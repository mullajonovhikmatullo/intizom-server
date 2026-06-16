import bcrypt from "bcrypt";
import { Prisma } from "../../../generated/prisma/client.js";
import { HttpError } from "../../lib/http-error.js";
import { signAccessToken } from "../../lib/jwt.js";
import { prisma } from "../../lib/prisma.js";
import type { LoginInput, RegisterInput, UpdateProfileInput } from "./auth.validation.js";

const SALT_ROUNDS = 12;

const toPublicUser = (user: { id: string; name: string; email: string }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});

const createAuthResponse = (user: { id: string; name: string; email: string }) => ({
  user: toPublicUser(user),
  accessToken: signAccessToken({ sub: user.id, email: user.email }),
});

export const register = async (input: RegisterInput) => {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
      },
      select: { id: true, name: true, email: true },
    });

    return createAuthResponse(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "EMAIL_ALREADY_EXISTS", "Email already exists");
    }

    throw error;
  }
};

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, name: true, email: true, passwordHash: true },
  });

  if (!user) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  return createAuthResponse(user);
};

export const updateProfile = async (userId: string, input: UpdateProfileInput) => {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
      select: { id: true, name: true, email: true },
    });

    return toPublicUser(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "EMAIL_ALREADY_EXISTS", "Email already exists");
    }

    throw error;
  }
};
