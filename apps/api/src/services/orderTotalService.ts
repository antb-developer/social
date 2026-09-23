import { AppError } from "../middleware/errors";

export type ProductRecord = {
  id: string;
  name: string;
  price_paise: number;
  in_stock: boolean;
  is_active: boolean;
};

export type CartLine = {
  product_id: string;
  qty: number;
};

export type PricedOrderItem = {
  product_id: string;
  name_snapshot: string;
  price_snapshot_paise: number;
  qty: number;
};

/**
 * Re-prices a customer's cart against the seller's own product records,
 * ignoring any price the client sent. Throws if a product is unknown,
 * inactive, out of stock, or the requested quantity is invalid.
 */
export function priceCartLines(products: ProductRecord[], cart: CartLine[]): PricedOrderItem[] {
  if (cart.length === 0) {
    throw new AppError(400, "empty_cart", "Cart has no items");
  }

  return cart.map((line) => {
    if (!Number.isInteger(line.qty) || line.qty <= 0) {
      throw new AppError(400, "invalid_quantity", "Quantity must be a positive integer");
    }

    const product = products.find((p) => p.id === line.product_id);
    if (!product) {
      throw new AppError(400, "invalid_product", `Unknown product ${line.product_id}`);
    }
    if (!product.is_active) {
      throw new AppError(409, "product_unavailable", `${product.name} is no longer available`);
    }
    if (!product.in_stock) {
      throw new AppError(409, "product_out_of_stock", `${product.name} is out of stock`);
    }

    return {
      product_id: product.id,
      name_snapshot: product.name,
      price_snapshot_paise: product.price_paise,
      qty: line.qty,
    };
  });
}

export function sumOrderItemsPaise(items: Array<{ price_snapshot_paise: number; qty: number }>): number {
  return items.reduce((sum, item) => sum + item.price_snapshot_paise * item.qty, 0);
}
