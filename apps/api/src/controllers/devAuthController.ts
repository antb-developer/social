import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../middleware/errors";
import { ensureCustomer, findCustomerById, updateCustomerName } from "../repositories/customerRepository";
import { findOrCreateAuthUserByPhone } from "../repositories/authUserRepository";

// TEMPORARY: backs the static-OTP dev bypass (see middleware/auth.ts). Finds
// or creates a real Supabase auth user for the given phone using the
// service-role key, so the rest of the app (RLS, requireSellerMembership,
// etc.) still sees a real user id — just without a real Supabase session.
// 404s outright unless DEV_OTP_MODE is on, so this can never be reachable
// in production.
const devLoginSchema = z.object({
  phone: z.string().min(6),
});

export async function devLogin(req: Request, res: Response) {
  if (!env.devOtpMode) {
    throw new AppError(404, "not_found", "No route for POST /api/dev/login");
  }

  const body = devLoginSchema.parse(req.body);
  const userId = await findOrCreateAuthUserByPhone(body.phone);
  await ensureCustomer(userId, body.phone);
  const customer = await findCustomerById(userId);

  res.json({ userId, phone: body.phone, name: customer?.name ?? null });
}

const setNameSchema = z.object({
  name: z.string().min(1),
});

export async function devSetCustomerName(req: Request, res: Response) {
  if (!env.devOtpMode) {
    throw new AppError(404, "not_found", "No route for POST /api/dev/customer-name");
  }
  if (!req.user) {
    throw new AppError(401, "unauthorized", "Missing bearer token");
  }

  const body = setNameSchema.parse(req.body);
  await updateCustomerName(req.user.id, body.name);
  res.json({ ok: true });
}
