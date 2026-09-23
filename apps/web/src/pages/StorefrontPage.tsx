import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ShareStoreButton } from "../components/store/ShareStoreButton";
import { useCart } from "../hooks/useCart";
import { apiFetch } from "../lib/apiClient";
import { button, card, pill } from "../lib/ui";
import { buildWhatsAppUrl } from "../lib/whatsapp";

type Seller = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  whatsapp_number: string | null;
  logo_url: string | null;
  is_accepting_orders: boolean;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price_paise: number;
  images: string[];
  in_stock: boolean;
};

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

const stepperButton =
  "flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40";

export function StorefrontPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const cart = useCart(slug);
  const [search, setSearch] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

  const sellerQuery = useQuery({
    queryKey: ["store", slug],
    queryFn: () => apiFetch<Seller>(`/api/stores/${slug}`),
  });

  const productsQuery = useQuery({
    queryKey: ["store", slug, "products"],
    queryFn: () => apiFetch<Product[]>(`/api/stores/${slug}/products`),
    enabled: sellerQuery.isSuccess,
  });

  const products = productsQuery.data;
  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products ?? []).filter(
      (p) =>
        (!inStockOnly || p.in_stock) &&
        (!q || p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q))
    );
  }, [products, search, inStockOnly]);

  if (sellerQuery.isLoading) {
    return <div className="p-4 text-sm text-gray-500">Loading store...</div>;
  }

  if (sellerQuery.isError || !sellerQuery.data) {
    return <div className="p-4 text-sm text-red-600">This store could not be found.</div>;
  }

  const seller = sellerQuery.data;
  const isFiltering = search.trim() !== "" || inStockOnly;

  return (
    <div className="mx-auto max-w-6xl pb-28">
      <section className="px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="flex flex-col gap-5 rounded-2xl border border-gray-200 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="flex gap-4">
            {seller.logo_url ? (
              <img src={seller.logo_url} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-500">
                {seller.name.trim().slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-title-sm font-semibold tracking-tight text-gray-900">{seller.name}</h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    seller.is_accepting_orders ? "bg-success-50 text-success-600" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {seller.is_accepting_orders ? "Accepting orders" : "Not accepting orders"}
                </span>
              </div>
              {seller.description && <p className="mt-2 max-w-xl text-sm text-gray-600">{seller.description}</p>}
              {seller.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(seller.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-start gap-1.5 text-sm text-gray-600 hover:text-brand-600"
                >
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  <span>{seller.address}</span>
                </a>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {seller.whatsapp_number && (
              <a
                href={buildWhatsAppUrl(
                  seller.whatsapp_number,
                  `Hi ${seller.name}, I'd like to know more about your products. ${window.location.href}`
                )}
                target="_blank"
                rel="noreferrer"
                className={button.secondary}
              >
                Chat on WhatsApp
              </a>
            )}
            <ShareStoreButton name={seller.name} />
          </div>
        </div>
      </section>

      {!seller.is_accepting_orders && (
        <div className="mx-4 mt-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 sm:mx-6">
          This store isn't accepting new orders right now.
        </div>
      )}

      <div className="p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            aria-label="Search products"
            placeholder="Search products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 sm:max-w-xs"
          />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setInStockOnly(false)} className={pill(!inStockOnly)}>
              All
            </button>
            <button type="button" onClick={() => setInStockOnly(true)} className={pill(inStockOnly)}>
              In stock
            </button>
            {products && (
              <span className="ml-1 text-sm text-gray-500">
                {visibleProducts.length} {visibleProducts.length === 1 ? "product" : "products"}
              </span>
            )}
          </div>
        </div>

        {productsQuery.isLoading && <p className="text-sm text-gray-500">Loading products...</p>}
        {productsQuery.isError && <p className="text-sm text-red-600">Could not load products.</p>}
        {products?.length === 0 && <p className="text-sm text-gray-500">No products yet.</p>}
        {products && products.length > 0 && visibleProducts.length === 0 && (
          <p className="text-sm text-gray-500">
            No products match your search.{" "}
            {isFiltering && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setInStockOnly(false);
                }}
                className="font-medium text-brand-500 hover:text-brand-600"
              >
                Clear filters
              </button>
            )}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visibleProducts.map((product) => {
            const qty = cart.items.find((i) => i.productId === product.id)?.qty ?? 0;
            return (
              <div key={product.id} className={`${card} p-3 ${product.in_stock ? "" : "opacity-50"}`}>
                {product.images[0] && (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="mb-3 aspect-square w-full rounded-lg object-cover"
                  />
                )}
                <p className="text-sm font-medium text-gray-900">{product.name}</p>
                {product.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{product.description}</p>
                )}
                <p className="mt-1 text-sm text-gray-600">{formatRupees(product.price_paise)}</p>
                {!product.in_stock ? (
                  <p className="mt-2 text-xs text-gray-400">Out of stock</p>
                ) : qty > 0 ? (
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => cart.setQty(product.id, qty - 1)}
                      className={stepperButton}
                      aria-label={`Decrease quantity of ${product.name}`}
                    >
                      -
                    </button>
                    <span className="text-sm font-medium text-gray-900" aria-live="polite">
                      {qty}
                    </span>
                    <button
                      type="button"
                      disabled={!seller.is_accepting_orders}
                      onClick={() => cart.setQty(product.id, qty + 1)}
                      className={stepperButton}
                      aria-label={`Increase quantity of ${product.name}`}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!seller.is_accepting_orders}
                    onClick={() =>
                      cart.addItem({
                        productId: product.id,
                        name: product.name,
                        price_paise: product.price_paise,
                      })
                    }
                    className={`mt-3 w-full ${button.primary} py-2 text-sm`}
                  >
                    Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {cart.itemCount > 0 && (
        <button
          type="button"
          onClick={() => navigate(`/s/${slug}/cart`)}
          className="fixed inset-x-0 bottom-0 flex items-center justify-between bg-gray-900 px-4 py-3.5 text-white sm:px-6"
        >
          <span>
            {cart.itemCount} item{cart.itemCount > 1 ? "s" : ""}
          </span>
          <span>{formatRupees(cart.totalPaise)} &middot; View cart</span>
        </button>
      )}
    </div>
  );
}
