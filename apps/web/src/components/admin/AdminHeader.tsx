import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useClickOutside } from "../../hooks/useClickOutside";
import { BellIcon, ChevronDownIcon, LogoutIcon, MenuIcon, SearchIcon, SettingsIcon } from "./icons";

type Props = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  displayName: string;
  settingsPath: string;
  logoutTo: string;
  showSearch?: boolean;
};

export function AdminHeader({
  sidebarOpen,
  setSidebarOpen,
  displayName,
  settingsPath,
  logoutTo,
  showSearch = true,
}: Props) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useClickOutside<HTMLDivElement>(() => setNotifOpen(false), notifOpen);
  const profileRef = useClickOutside<HTMLDivElement>(() => setProfileOpen(false), profileOpen);

  const initials = displayName.trim().slice(0, 2).toUpperCase();

  async function handleLogout() {
    await signOut();
    navigate(logoutTo);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          {showSearch && (
            <div className="relative hidden sm:block">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders, products..."
                className="h-11 w-56 rounded-lg border border-gray-300 bg-transparent py-2.5 pl-10 pr-3 text-sm text-gray-700 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 md:w-72"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
              aria-label="Notifications"
            >
              <BellIcon className="h-5 w-5" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg">
                <p className="px-2 py-1.5 text-sm font-medium text-gray-800">Notifications</p>
                <div className="px-2 py-6 text-center text-sm text-gray-500">No new notifications</div>
              </div>
            )}
          </div>

          <div className="h-8 w-px bg-gray-200" />

          <div ref={profileRef} className="relative">
            <button type="button" onClick={() => setProfileOpen((v) => !v)} className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
                {initials || "SD"}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium text-gray-800">{displayName}</span>
                <span className="block text-xs text-gray-500">{user?.phone ?? ""}</span>
              </span>
              <ChevronDownIcon
                className={`h-4 w-4 text-gray-400 transition-transform ${profileOpen ? "rotate-180" : ""}`}
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-theme-lg">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate(settingsPath);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <SettingsIcon className="h-4 w-4" />
                  Account settings
                </button>
                <div className="my-1 h-px bg-gray-100" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50"
                >
                  <LogoutIcon className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
