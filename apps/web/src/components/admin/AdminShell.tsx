import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AdminFooter } from "./AdminFooter";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar, type NavItem } from "./AdminSidebar";

type Props = {
  brand: { to: string; label: string };
  items: NavItem[];
  displayName: string;
  settingsPath: string;
  logoutTo: string;
  showSearch?: boolean;
};

// Sidebar + header + footer + the shared content container. Seller and
// customer areas both render inside this; each supplies its own nav, identity
// and destinations (see AdminLayout and CustomerLayout).
export function AdminShell({ brand, items, displayName, settingsPath, logoutTo, showSearch }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} items={items} brand={brand} />

      <div className="relative flex flex-1 flex-col overflow-y-auto">
        <AdminHeader
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          displayName={displayName}
          settingsPath={settingsPath}
          logoutTo={logoutTo}
          showSearch={showSearch}
        />

        <main className="mx-auto w-full max-w-screen-2xl flex-1 p-4 md:p-6">
          <Outlet />
        </main>

        <AdminFooter />
      </div>
    </div>
  );
}
