import type { ComponentType } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { CloseIcon, StoreIcon } from "./icons";

export type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
  /** Extra path prefixes that keep this item highlighted (e.g. "/o/" for order pages). */
  alsoActiveFor?: string[];
};

type Props = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  items: NavItem[];
  brand: { to: string; label: string };
};

export function AdminSidebar({ sidebarOpen, setSidebarOpen, items, brand }: Props) {
  const { pathname } = useLocation();

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-gray-200 bg-white duration-300 ease-linear lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-6 py-6">
          <NavLink to={brand.to} className="flex items-center gap-2.5 text-gray-800">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500">
              <StoreIcon className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-semibold">{brand.label}</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 lg:hidden"
            aria-label="Close sidebar"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-2">
          <p className="mb-3 px-3 text-xs uppercase leading-5 text-gray-400">Menu</p>
          <nav>
            <ul className="flex flex-col gap-1">
              {items.map((item) => {
                const relatedActive = item.alsoActiveFor?.some((prefix) => pathname.startsWith(prefix)) ?? false;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `group menu-item ${isActive || relatedActive ? "menu-item-active" : "menu-item-inactive"}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={`h-5 w-5 shrink-0 ${
                              isActive || relatedActive ? "menu-item-icon-active" : "menu-item-icon-inactive"
                            }`}
                          />
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}
