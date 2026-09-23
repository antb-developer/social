import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errors";
import { upsertPushSubscription } from "../repositories/pushSubscriptionRepository";

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, "unauthorized", "Missing bearer token");
  }
  return req.user;
}

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function subscribeToPush(req: Request, res: Response) {
  const user = requireUser(req);
  const body = subscribeSchema.parse(req.body);
  const subscription = await upsertPushSubscription({
    userId: user.id,
    endpoint: body.endpoint,
    keys: body.keys,
  });
  res.status(201).json(subscription);
}
