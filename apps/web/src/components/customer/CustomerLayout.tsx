import { useMe } from "../../hooks/useMe";
import { AdminShell } from "../admin/AdminShell";
import type { NavItem } from "../admin/AdminSidebar";
import { GridIcon, OrdersIcon, SettingsIcon } from "../admin/icons";

const NAV_ITEMS: NavItem[] = [
  { to: "/account", label: "Overview", icon: GridIcon, end: true },
  { to: "/my-orders", label: "My orders", icon: OrdersIcon, alsoActiveFor: ["/o/"] },
  { to: "/account/settings", label: "Settings", icon: SettingsIcon },
];

// The customer counterpart to AdminLayout: same shell, customer nav and identity.
export function CustomerLayout() {
  const meQuery = useMe();

  return (
    <AdminShell
      brand={{ to: "/account", label: "Order Desk" }}
      items={NAV_ITEMS}
      displayName={meQuery.data?.name ?? "Your account"}
      settingsPath="/account/settings"
      logoutTo="/login?role=customer"
      showSearch={false}
    />
  );
}
