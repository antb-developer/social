import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errors";
import { findAuthUserPhoneById, findOrCreateAuthUserByPhone } from "../repositories/authUserRepository";
import { addSellerMember, findMembersForSeller, findSellerById, updateSeller } from "../repositories/sellerRepository";
import { isValidSlug } from "../services/slugService";

function requireSellerId(req: Request) {
  if (!req.sellerId) {
    throw new AppError(401, "unauthorized", "Missing seller session");
  }
  return req.sellerId;
}

export async function getSellerSettings(req: Request, res: Response) {
  const sellerId = requireSellerId(req);
  const seller = await findSellerById(sellerId);
  if (!seller) {
    throw new AppError(404, "store_not_found", "No such store");
  }
  res.json(seller);
}

const updateSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().refine(isValidSlug, { message: "Slug must be lowercase letters/digits/hyphens and not a reserved word" }).optional(),
  description: z.string().trim().max(500).optional(),
  address: z.string().trim().max(300).optional(),
  whatsapp_number: z.string().optional(),
  upi_id: z.string().optional(),
  upi_name: z.string().optional(),
  logo_url: z.string().url().optional(),
  is_accepting_orders: z.boolean().optional(),
});

export async function updateSellerSettings(req: Request, res: Response) {
  const sellerId = requireSellerId(req);
  const body = updateSettingsSchema.parse(req.body);
  const seller = await updateSeller(sellerId, body);
  if (!seller) {
    throw new AppError(404, "store_not_found", "No such store");
  }
  res.json(seller);
}

const addMemberSchema = z.object({
  phone: z.string().min(6),
  role: z.enum(["owner", "staff"]),
});

export async function addSellerMemberHandler(req: Request, res: Response) {
  const sellerId = requireSellerId(req);
  const body = addMemberSchema.parse(req.body);
  const userId = await findOrCreateAuthUserByPhone(body.phone);
  const member = await addSellerMember(sellerId, userId, body.role);
  res.status(201).json(member);
}

export async function listSellerMembersHandler(req: Request, res: Response) {
  const sellerId = requireSellerId(req);
  const members = await findMembersForSeller(sellerId);
  const enriched = await Promise.all(
    members.map(async (member) => ({
      user_id: member.user_id,
      role: member.role,
      phone: await findAuthUserPhoneById(member.user_id),
    }))
  );
  res.json(enriched);
}
