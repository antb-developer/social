import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errors";
import { ensureCustomer, updateCustomerName } from "../repositories/customerRepository";
import {
  addSellerMember,
  createSeller,
  findMembershipForUser,
} from "../repositories/sellerRepository";
import { createTemplate } from "../repositories/templateRepository";
import { isValidSlug, slugify } from "../services/slugService";

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, "unauthorized", "Missing bearer token");
  }
  return req.user;
}

const signupSchema = z.object({
  store_name: z.string().min(1),
  slug: z.string().optional(),
  // The owner's own name, kept on their customers row (sellers.name is the store name).
  owner_name: z.string().trim().min(1).optional(),
});

export async function sellerSignup(req: Request, res: Response) {
  const user = requireUser(req);

  const existing = await findMembershipForUser(user.id);
  if (existing) {
    throw new AppError(409, "already_a_seller", "You already have a store");
  }

  const body = signupSchema.parse(req.body);
  const candidateSlug = body.slug ?? slugify(body.store_name);
  if (!isValidSlug(candidateSlug)) {
    throw new AppError(400, "invalid_slug", "Please choose a different store link");
  }
  if (!user.phone) {
    throw new AppError(400, "phone_required", "Your account has no phone number on file");
  }

  const seller = await createSeller({ name: body.store_name, slug: candidateSlug, phone: user.phone });
  await addSellerMember(seller.id, user.id, "owner");

  if (body.owner_name) {
    await ensureCustomer(user.id, user.phone);
    await updateCustomerName(user.id, body.owner_name);
  }

  // Seed defaults per spec: every new store starts with a payment-request
  // and a shipping-address template ready to send.
  await createTemplate(seller.id, {
    kind: "payment_request",
    title: "Payment details",
    body: "Please pay via UPI and upload your payment proof.",
  });
  await createTemplate(seller.id, {
    kind: "form_request",
    title: "Shipping address",
    body: "Please share your shipping address.",
    fields: [
      { key: "name", label: "Full name", type: "text", required: true },
      { key: "phone", label: "Phone", type: "phone", required: true },
      { key: "address_line", label: "Address line", type: "textarea", required: true },
      { key: "city", label: "City", type: "text", required: true },
      { key: "state", label: "State", type: "text", required: true },
      { key: "pincode", label: "Pincode", type: "pincode", required: true },
    ],
  });

  res.status(201).json(seller);
}
