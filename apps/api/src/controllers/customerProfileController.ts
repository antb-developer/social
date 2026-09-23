import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errors";
import { ensureCustomer, findCustomerById, updateCustomerName } from "../repositories/customerRepository";

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, "unauthorized", "Missing bearer token");
  }
  return req.user;
}

export async function getMyProfile(req: Request, res: Response) {
  const user = requireUser(req);
  // Sellers and anyone who signed in without placing an order may not have a
  // customers row yet.
  await ensureCustomer(user.id, user.phone);
  const customer = await findCustomerById(user.id);
  res.json(customer);
}

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function updateMyProfile(req: Request, res: Response) {
  const user = requireUser(req);
  const body = updateProfileSchema.parse(req.body);
  await ensureCustomer(user.id, user.phone);
  await updateCustomerName(user.id, body.name);
  res.json(await findCustomerById(user.id));
}
