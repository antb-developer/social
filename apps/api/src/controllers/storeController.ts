import type { Request, Response } from "express";
import { AppError } from "../middleware/errors";
import { findActiveProductsBySeller } from "../repositories/productRepository";
import { findSellerBySlug } from "../repositories/sellerRepository";

export async function getStoreBySlug(req: Request, res: Response) {
  const seller = await findSellerBySlug(req.params.slug);
  if (!seller) {
    throw new AppError(404, "store_not_found", "No store with this link");
  }
  res.json(seller);
}

export async function getStoreProducts(req: Request, res: Response) {
  const seller = await findSellerBySlug(req.params.slug);
  if (!seller) {
    throw new AppError(404, "store_not_found", "No store with this link");
  }
  const products = await findActiveProductsBySeller(seller.id);
  res.json(products);
}
