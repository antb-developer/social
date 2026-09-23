import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { OtpLoginModal } from "../components/auth/OtpLoginModal";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../hooks/useCart";
import { apiFetch } from "../lib/apiClient";
import { button } from "../lib/ui";

type Seller = {
  id: string;
  name: string;
  slug: string;
  is_accepting_orders: boolean;
};

type OrderResponse = { id: string };

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function CartPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cart = useCart(slug);
  const [showLogin, setShowLogin] = useState(false);

  const sellerQuery = useQuery({
    queryKey: ["store", slug],
    queryFn: () => apiFetch<Seller>(`/api/stores/${slug}`),
  });

  const placeOrder = useMutation({
    mutationFn: () => {
      const seller = sellerQuery.data;
      if (!seller) {
        throw new Error("Store details are still loading. Please try again.");
      }
      return apiFetch<OrderResponse>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          seller_id: seller.id,
          items: cart.items.map((i) => ({ product_id: i.productId, qty: i.qty })),
        }),
      });
    },
    onSuccess: (order) => {
      cart.clear();
      navigate(`/o/${order.id}`);
    },
  });

  function handlePlaceOrder() {
    if (!user) {
      setShowLogin(true);
      return;
    }
    placeOrder.mutate();
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <p className="text-sm text-gray-500">Your cart is empty.</p>
        <Link to={`/s/${slug}`} className="mt-2 inline-block text-sm font-medium text-brand-500 hover:text-brand-600">
          Browse the store
        </Link>
      </div>
    );
  }

  const canPlaceOrder = Boolean(sellerQuery.data) && sellerQuery.data?.is_accepting_orders !== false;

  return (
    <div className="mx-auto max-w-2xl pb-36">
      <header className="border-b border-gray-200 p-4 sm:p-6">
        <Link to={`/s/${slug}`} className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Continue shopping
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-gray-900">Your cart</h1>
      </header>

      <div className="divide-y divide-gray-100">
        {cart.items.map((item) => (
          <div key={item.productId} className="flex items-center justify-between p-4 sm:px-6">
            <div>
              <p className="text-sm font-medium text-gray-900">{item.name}</p>
              <p className="text-sm text-gray-600">{formatRupees(item.price_paise)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cart.setQty(item.productId, item.qty - 1)}
                className="h-8 w-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                aria-label={`Decrease quantity of ${item.name}`}
              >
                -
              </button>
              <span className="w-6 text-center">{item.qty}</span>
              <button
                type="button"
                onClick={() => cart.setQty(item.productId, item.qty + 1)}
                className="h-8 w-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                aria-label={`Increase quantity of ${item.name}`}
              >
                +
              </button>
              <button
                type="button"
                onClick={() => cart.removeItem(item.productId)}
                className="ml-2 text-xs font-medium text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {!sellerQuery.data?.is_accepting_orders && sellerQuery.isSuccess && (
        <p className="px-4 text-sm text-amber-700 sm:px-6">This store isn't accepting orders right now.</p>
      )}

      {placeOrder.isError && (
        <p className="px-4 text-sm text-red-600 sm:px-6">
          {placeOrder.error instanceof Error ? placeOrder.error.message : "Could not place order."}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-3 flex justify-between text-sm font-medium">
            <span>Total</span>
            <span>{formatRupees(cart.totalPaise)}</span>
          </div>
          <button
            type="button"
            disabled={!canPlaceOrder || placeOrder.isPending}
            onClick={handlePlaceOrder}
            className={`w-full ${button.primary} py-3`}
          >
            {placeOrder.isPending ? "Placing order..." : "Place order"}
          </button>
        </div>
      </div>

      {showLogin && (
        <OtpLoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            placeOrder.mutate();
          }}
        />
      )}
    </div>
  );
}
