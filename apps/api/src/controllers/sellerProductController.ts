import type { Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase";
import { AppError } from "../middleware/errors";
import {
  createProduct,
  deleteProductForSeller,
  findAllProductsBySeller,
  reorderProducts,
  updateProductForSeller,
} from "../repositories/productRepository";

const PRODUCT_IMAGE_BUCKET = "product-images";

function requireSellerId(req: Request) {
  if (!req.sellerId) {
    throw new AppError(401, "unauthorized", "Missing seller session");
  }
  return req.sellerId;
}

export async function listSellerProducts(req: Request, res: Response) {
  const sellerId = requireSellerId(req);
  const products = await findAllProductsBySeller(sellerId);
  res.json(products);
}

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price_paise: z.number().int().nonnegative(),
  images: z.array(z.string().url()).optional(),
  in_stock: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export async function createSellerProduct(req: Request, res: Response) {
  const sellerId = requireSellerId(req);
  const body = createProductSchema.parse(req.body);
  const product = await createProduct(sellerId, body);
  res.status(201).json(product);
}

const updateProductSchema = createProductSchema.partial();

export async function updateSellerProduct(req: Request, res: Response) {
  const sellerId = requireSellerId(req);
  const body = updateProductSchema.parse(req.body);
  const product = await updateProductForSeller(sellerId, req.params.id, body);
  if (!product) {
    throw new AppError(404, "product_not_found", "No such product");
  }
  res.json(product);
}

export async function deleteSellerProduct(req: Request, res: Response) {
  const sellerId = requireSellerId(req);
  const product = await deleteProductForSeller(sellerId, req.params.id);
  if (!product) {
    throw new AppError(404, "product_not_found", "No such product");
  }
  res.status(204).send();
}

export async function uploadSellerProductImage(req: Request, res: Response) {
  const sellerId = requireSellerId(req);
  const file = req.file;
  if (!file) {
    throw new AppError(400, "missing_file", "No image file was uploaded");
  }
  if (!file.mimetype.startsWith("image/")) {
    throw new AppError(400, "invalid_file", "Only image uploads are allowed");
  }

  const path = `${sellerId}/${Date.now()}-${file.originalname}`;
  const { error } = await supabaseAdmin.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) {
    throw new AppError(502, "upload_failed", error.message);
  }

  const { data } = supabaseAdmin.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  res.status(201).json({ url: data.publicUrl });
}

const reorderSchema = z.object({
  order: z.array(z.object({ id: z.string().uuid(), sort_order: z.number().int() })).min(1),
});

export async function reorderSellerProducts(req: Request, res: Response) {
  const sellerId = requireSellerId(req);
  const body = reorderSchema.parse(req.body);
  await reorderProducts(sellerId, body.order);
  res.status(204).send();
}
