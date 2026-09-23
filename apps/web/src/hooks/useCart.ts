import { useCallback, useEffect, useRef, useState } from "react";
import {
  cartItemCount,
  cartTotalPaise,
  clearCart as clearStoredCart,
  loadCart,
  saveCart,
  withAddedItem,
  withQty,
  type CartItem,
} from "../lib/cart";

export function useCart(sellerSlug: string) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart(sellerSlug));
  const loadedSlugRef = useRef(sellerSlug);

  // Only ever *reads* on a slug change — writes happen exclusively inside
  // the mutators below, each scoped to the slug it was called with. Coupling
  // "load on slug change" and "save on items change" in one effect would
  // race: on a slug change the save-effect would still see the old items
  // and clobber the new slug's stored cart with them before the load fires.
  useEffect(() => {
    if (loadedSlugRef.current !== sellerSlug) {
      loadedSlugRef.current = sellerSlug;
      setItems(loadCart(sellerSlug));
    }
  }, [sellerSlug]);

  const addItem = useCallback(
    (item: { productId: string; name: string; price_paise: number }, qty = 1) => {
      setItems((prev) => {
        const next = withAddedItem(prev, item, qty);
        saveCart(sellerSlug, next);
        return next;
      });
    },
    [sellerSlug]
  );

  const setQty = useCallback(
    (productId: string, qty: number) => {
      setItems((prev) => {
        const next = withQty(prev, productId, qty);
        saveCart(sellerSlug, next);
        return next;
      });
    },
    [sellerSlug]
  );

  const removeItem = useCallback((productId: string) => setQty(productId, 0), [setQty]);

  const clear = useCallback(() => {
    clearStoredCart(sellerSlug);
    setItems([]);
  }, [sellerSlug]);

  return {
    items,
    addItem,
    setQty,
    removeItem,
    clear,
    totalPaise: cartTotalPaise(items),
    itemCount: cartItemCount(items),
  };
}
