import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { Breadcrumb } from "../../components/admin/Breadcrumb";
import { Badge } from "../../components/admin/ui/Badge";
import { Button } from "../../components/admin/ui/Button";
import { ComponentCard } from "../../components/admin/ui/ComponentCard";
import { Input } from "../../components/admin/ui/Input";
import { Label } from "../../components/admin/ui/Label";
import { Modal } from "../../components/admin/ui/Modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/admin/ui/Table";
import { PlusIcon, SearchIcon } from "../../components/admin/icons";
import { useModal } from "../../hooks/useModal";
import { apiFetch } from "../../lib/apiClient";
import { compressImage } from "../../lib/imageCompression";
import { moveItem } from "../../lib/reorder";
import { uploadProductImage } from "../../lib/storage";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price_paise: number;
  images: string[];
  in_stock: boolean;
  is_active: boolean;
  sort_order: number;
};

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function DashboardProductsPage() {
  const queryClient = useQueryClient();
  const addProductModal = useModal();

  const productsQuery = useQuery({
    queryKey: ["seller-products"],
    queryFn: () => apiFetch<Product[]>("/api/seller/products"),
  });

  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  useEffect(() => {
    if (productsQuery.data) {
      setOrderedIds(productsQuery.data.map((p) => p.id));
    }
  }, [productsQuery.data]);

  const products = orderedIds
    .map((id) => productsQuery.data?.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  const [search, setSearch] = useState("");
  const visibleProducts = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase())),
    [products, search]
  );

  function refetchProducts() {
    queryClient.invalidateQueries({ queryKey: ["seller-products"] });
  }

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      let images: string[] = [];
      if (file) {
        const compressed = await compressImage(file);
        const url = await uploadProductImage(compressed, file.name);
        images = [url];
      }
      await apiFetch("/api/seller/products", {
        method: "POST",
        body: JSON.stringify({
          name,
          price_paise: Math.round(Number(price) * 100),
          images,
        }),
      });
      setName("");
      setPrice("");
      setFile(null);
      refetchProducts();
      addProductModal.closeModal();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create product");
    } finally {
      setCreating(false);
    }
  }

  const toggleStock = useMutation({
    mutationFn: (product: Product) =>
      apiFetch(`/api/seller/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ in_stock: !product.in_stock }),
      }),
    onSuccess: refetchProducts,
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/seller/products/${id}`, { method: "DELETE" }),
    onSuccess: refetchProducts,
  });

  const reorder = useMutation({
    mutationFn: (order: Array<{ id: string; sort_order: number }>) =>
      apiFetch("/api/seller/products/reorder", { method: "PATCH", body: JSON.stringify({ order }) }),
  });

  const [dragId, setDragId] = useState<string | null>(null);

  function handleDrop(targetId: string) {
    if (!dragId) return;
    const next = moveItem(orderedIds, dragId, targetId);
    setOrderedIds(next);
    reorder.mutate(next.map((id, i) => ({ id, sort_order: i })));
    setDragId(null);
  }

  return (
    <div>
      <Breadcrumb
        title="Products"
        description="Add and manage what customers see on your storefront."
        action={
          <Button onClick={addProductModal.openModal} startIcon={<PlusIcon />}>
            Add Product
          </Button>
        }
      />

      <ComponentCard bodyClassName="p-0">
        <div className="border-b border-gray-100 p-4 sm:p-5">
          <div className="relative max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search products"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Product
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Price
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Stock
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {productsQuery.isLoading && (
                <TableRow>
                  <TableCell className="px-5 py-5 text-sm text-gray-500">Loading products...</TableCell>
                </TableRow>
              )}
              {!productsQuery.isLoading && visibleProducts.length === 0 && (
                <TableRow>
                  <TableCell className="px-5 py-5 text-sm text-gray-500">No products found.</TableCell>
                </TableRow>
              )}
              {visibleProducts.map((product) => (
                <TableRow
                  key={product.id}
                  draggable
                  onDragStart={() => setDragId(product.id)}
                  onDragOver={(e: DragEvent) => e.preventDefault()}
                  onDrop={() => handleDrop(product.id)}
                  className={`hover:bg-gray-50 ${product.in_stock ? "" : "opacity-60"}`}
                >
                  <TableCell className="px-5 py-3.5 text-start">
                    <div className="flex items-center gap-3">
                      <span className="cursor-grab text-gray-400" aria-hidden>
                        &#x2630;
                      </span>
                      {product.images[0] ? (
                        <img src={product.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-100" />
                      )}
                      <span className="text-theme-sm font-medium text-gray-800">{product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-start text-theme-sm text-gray-600">
                    {formatRupees(product.price_paise)}
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-start">
                    <button
                      type="button"
                      onClick={() => {
                        const action = product.in_stock ? "mark out of stock" : "mark in stock";
                        if (window.confirm(`Are you sure you want to ${action} "${product.name}"?`)) {
                          toggleStock.mutate(product);
                        }
                      }}
                    >
                      <Badge size="sm" color={product.in_stock ? "success" : "light"}>
                        {product.in_stock ? "In stock" : "Out of stock"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-start">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete "${product.name}"? This can't be undone.`)) {
                          deleteProduct.mutate(product.id);
                        }
                      }}
                      className="text-theme-xs font-medium text-error-600 hover:text-error-700"
                    >
                      Delete
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ComponentCard>

      <Modal isOpen={addProductModal.isOpen} onClose={addProductModal.closeModal} className="max-w-md p-6">
        <form onSubmit={handleCreate} className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">Add product</h3>
          <div>
            <Label htmlFor="product-name">Name</Label>
            <Input id="product-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="product-price">Price (₹)</Label>
            <Input
              id="product-price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="product-image">Image</Label>
            <input
              id="product-image"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-600"
            />
          </div>
          {createError && <p className="text-sm text-error-600">{createError}</p>}
          <Button type="submit" disabled={creating} fullWidth>
            {creating ? "Adding..." : "Add product"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
