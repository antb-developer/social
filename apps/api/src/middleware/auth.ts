import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { supabaseAdmin } from "../config/supabase";
import { findAuthUserPhoneById } from "../repositories/authUserRepository";
import { SUPERADMIN_TOKEN_PREFIX, verifySuperadminToken } from "../services/superadminTokenService";
import { AppError } from "./errors";

const DEV_TOKEN_PREFIX = "dev:";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    next(new AppError(401, "unauthorized", "Missing bearer token"));
    return;
  }

  // Superadmin's own username+password login (see superadminAuthController)
  // mints this token type. Checked independent of DEV_OTP_MODE, unlike the
  // dev-token bypass below — this is meant to work in every environment.
  if (token.startsWith(SUPERADMIN_TOKEN_PREFIX)) {
    const verified = verifySuperadminToken(token);
    if (!verified) {
      next(new AppError(401, "unauthorized", "Invalid or expired token"));
      return;
    }
    const phone = await findAuthUserPhoneById(verified.userId);
    req.user = { id: verified.userId, phone: phone ?? null };
    next();
    return;
  }

  // TEMPORARY: static-OTP dev bypass, only while phone auth isn't configured
  // on the Supabase project. Frontend mints this token (see
  // apps/web/src/lib/staticAuth.ts) after the user enters the static "1234"
  // code instead of a real one — see hooks/useOtpAuth.ts and
  // hooks/useSellerOtpAuth.ts for the commented-out real Supabase OTP calls
  // this is standing in for. Remove this whole block once phone auth works.
  if (env.devOtpMode && token.startsWith(DEV_TOKEN_PREFIX)) {
    const userId = token.slice(DEV_TOKEN_PREFIX.length);
    const phone = await findAuthUserPhoneById(userId);
    if (!phone) {
      next(new AppError(401, "unauthorized", "Invalid or expired token"));
      return;
    }
    req.user = { id: userId, phone };
    next();
    return;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    next(new AppError(401, "unauthorized", "Invalid or expired token"));
    return;
  }

  req.user = { id: data.user.id, phone: data.user.phone ?? null };
  next();
}

/** Resolves the caller's seller membership and attaches sellerId/sellerRole. */
export async function requireSellerMembership(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new AppError(401, "unauthorized", "Missing bearer token"));
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("seller_members")
    .select("seller_id, role")
    .eq("user_id", req.user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    next(error);
    return;
  }

  if (!data) {
    next(new AppError(403, "forbidden", "You are not a member of any seller account"));
    return;
  }

  req.sellerId = data.seller_id;
  req.sellerRole = data.role as "owner" | "staff";
  next();
}

/** Must run after requireSellerMembership. Restricts to the store owner. */
export function requireOwner(req: Request, _res: Response, next: NextFunction) {
  if (req.sellerRole !== "owner") {
    next(new AppError(403, "forbidden", "Only the store owner can do this"));
    return;
  }
  next();
}

/** Must run after requireAuth. Restricts to platform staff with a superadmins row. */
export async function requireSuperadmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new AppError(401, "unauthorized", "Missing bearer token"));
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("superadmins")
    .select("user_id")
    .eq("user_id", req.user.id)
    .maybeSingle();

  if (error) {
    next(error);
    return;
  }

  if (!data) {
    next(new AppError(403, "forbidden", "Superadmin access required"));
    return;
  }

  req.isSuperadmin = true;
  next();
}
