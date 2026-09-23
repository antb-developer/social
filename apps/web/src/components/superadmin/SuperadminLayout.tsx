import { AdminShell } from "../admin/AdminShell";
import type { NavItem } from "../admin/AdminSidebar";
import { GridIcon, OrdersIcon, StoreIcon } from "../admin/icons";

const NAV_ITEMS: NavItem[] = [
  { to: "/superadmin/dashboard", label: "Dashboard", icon: GridIcon, end: true },
  { to: "/superadmin/stores", label: "Stores", icon: StoreIcon, alsoActiveFor: ["/superadmin/stores/"] },
  { to: "/superadmin/orders", label: "Orders", icon: OrdersIcon },
];

// The platform-staff counterpart to AdminLayout: same shell, superadmin nav.
export function SuperadminLayout() {
  return (
    <AdminShell
      brand={{ to: "/superadmin/dashboard", label: "Superadmin" }}
      items={NAV_ITEMS}
      displayName="Platform staff"
      settingsPath="/superadmin/dashboard"
      logoutTo="/superadmin"
      showSearch={false}
    />
  );
}
