import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";
import { AdminShell } from "./AdminShell";
import type { NavItem } from "./AdminSidebar";
import { GridIcon, OrdersIcon, ProductsIcon, SettingsIcon, TemplatesIcon } from "./icons";

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: GridIcon, end: true },
  { to: "/dashboard/orders", label: "Orders", icon: OrdersIcon },
  { to: "/dashboard/products", label: "Products", icon: ProductsIcon },
  { to: "/dashboard/templates", label: "Templates", icon: TemplatesIcon },
  { to: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
];

// Every dashboard page shares this shell (sidebar, header, footer) and the
// same content container width/padding, so pages only render their own
// <Breadcrumb title="..."> + body content.
export function AdminLayout() {
  const sellerQuery = useQuery({
    queryKey: ["seller-settings"],
    queryFn: () => apiFetch<{ id: string; name: string }>("/api/seller/settings"),
  });

  return (
    <AdminShell
      brand={{ to: "/dashboard", label: "Seller Desk" }}
      items={NAV_ITEMS}
      displayName={sellerQuery.data?.name ?? "Your store"}
      settingsPath="/dashboard/settings"
      logoutTo="/login?role=store"
    />
  );
}
