import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { SUPERADMIN_IDENTITY_PHONE } from "../config/superadminIdentity";
import { AppError } from "../middleware/errors";
import { findOrCreateAuthUserByPhone } from "../repositories/authUserRepository";
import { ensureSuperadmin } from "../repositories/superadminRepository";
import { issueSuperadminToken } from "../services/superadminTokenService";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function superadminLogin(req: Request, res: Response) {
  const { username, password } = loginSchema.parse(req.body);

  // Fixed credentials, not a users table — see env.superadminUsername/Password.
  // Constant-time-ish by comparing both fields regardless of which fails first.
  const usernameOk = username === env.superadminUsername;
  const passwordOk = password === env.superadminPassword;
  if (!usernameOk || !passwordOk) {
    throw new AppError(401, "invalid_credentials", "Incorrect username or password");
  }

  const userId = await findOrCreateAuthUserByPhone(SUPERADMIN_IDENTITY_PHONE);
  await ensureSuperadmin(userId);

  const token = issueSuperadminToken(userId);
  res.json({ token });
}
