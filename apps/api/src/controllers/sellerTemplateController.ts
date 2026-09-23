import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errors";
import {
  createTemplate,
  deleteTemplateForSeller,
  findAllTemplatesBySeller,
  updateTemplateForSeller,
} from "../repositories/templateRepository";

function requireSellerId(req: Request) {
  if (!req.sellerId) {
    throw new AppError(401, "unauthorized", "Missing seller session");
  }
  return req.sellerId;
}

export async function listSellerTemplates(req: Request, res: Response) {
  const sellerId = requireSellerId(req);
  const templates = await findAllTemplatesBySeller(sellerId);
  res.json(templates);
}

const fieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "textarea", "phone", "pincode", "select"]),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});

const createTemplateSchema = z.object({
  kind: z.enum(["text", "payment_request", "form_request"]),
  title: z.string().min(1),
  body: z.string().optional(),
  fields: z.array(fieldSchema).optional(),
});

export async function createSellerTemplate(req: Request, res: Response) {
  const sellerId = requireSellerId(req);
  const body = createTemplateSchema.parse(req.body);
  const template = await createTemplate(sellerId, body);
  res.status(201).json(template);
}

const updateTemplateSchema = createTemplateSchema.partial();

export async function updateSellerTemplate(req: Request, res: Response) {
  const sellerId = requireSellerId(req);
  const body = updateTemplateSchema.parse(req.body);
  const template = await updateTemplateForSeller(sellerId, req.params.id, body);
  if (!template) {
    throw new AppError(404, "template_not_found", "No such template");
  }
  res.json(template);
}

export async function deleteSellerTemplate(req: Request, res: Response) {
  const sellerId = requireSellerId(req);
  const template = await deleteTemplateForSeller(sellerId, req.params.id);
  if (!template) {
    throw new AppError(404, "template_not_found", "No such template");
  }
  res.status(204).send();
}
