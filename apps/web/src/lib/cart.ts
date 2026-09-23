export type CartItem = {
  productId: string;
  name: string;
  price_paise: number;
  qty: number;
};

const CART_KEY_PREFIX = "sod:cart:";

export function loadCart(sellerSlug: string): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY_PREFIX + sellerSlug);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(sellerSlug: string, items: CartItem[]): void {
  localStorage.setItem(CART_KEY_PREFIX + sellerSlug, JSON.stringify(items));
}

export function clearCart(sellerSlug: string): void {
  localStorage.removeItem(CART_KEY_PREFIX + sellerSlug);
}

export function withAddedItem(
  items: CartItem[],
  item: { productId: string; name: string; price_paise: number },
  qty: number
): CartItem[] {
  const existing = items.find((i) => i.productId === item.productId);
  if (existing) {
    return items.map((i) => (i.productId === item.productId ? { ...i, qty: i.qty + qty } : i));
  }
  return [...items, { ...item, qty }];
}

export function withQty(items: CartItem[], productId: string, qty: number): CartItem[] {
  if (qty <= 0) {
    return items.filter((i) => i.productId !== productId);
  }
  return items.map((i) => (i.productId === productId ? { ...i, qty } : i));
}

export function cartTotalPaise(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price_paise * i.qty, 0);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}
