import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { button } from "../../lib/ui";
import { BrandLogo } from "../BrandLogo";

// Public storefront pages (store + cart) render as a normal web page: a navbar
// and content, no dashboard sidebar. Browsing needs no login, so the navbar
// adapts: logged in gets a way back to the profile, logged out gets a login.
export function StoreLayout() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          {user ? (
            <Link to="/account" className={button.secondary}>
              <svg viewBox="0 0 24 24" className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back to profile</span>
              <span className="sm:hidden">Profile</span>
            </Link>
          ) : (
            <BrandLogo />
          )}

          {!loading &&
            (user ? (
              <Link to="/my-orders" className={button.ghost}>
                My orders
              </Link>
            ) : (
              <Link to={`/login?role=customer&next=${encodeURIComponent(window.location.pathname)}`} className={button.brand}>
                Log in
              </Link>
            ))}
        </nav>
      </header>

      <Outlet />
    </div>
  );
}
