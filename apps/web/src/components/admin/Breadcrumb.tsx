import { Link, useLocation } from "react-router-dom";
import { ChevronRightIcon, HomeIcon } from "./icons";

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/orders": "Orders",
  "/dashboard/products": "Products",
  "/dashboard/templates": "Templates",
  "/dashboard/settings": "Settings",
};

type Props = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  homeTo?: string;
  homeLabel?: string;
};

export function Breadcrumb({ title, description, action, homeTo = "/dashboard", homeLabel = "Dashboard" }: Props) {
  const { pathname } = useLocation();
  const isOrderDetail = /^\/dashboard\/orders\/.+/.test(pathname);
  const label = title ?? (isOrderDetail ? "Order detail" : (PAGE_LABELS[pathname] ?? "Dashboard"));

  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-6">
      <div>
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-gray-500" aria-label="Breadcrumb">
          <Link to={homeTo} className="flex items-center gap-1 hover:text-gray-700">
            <HomeIcon />
            {homeLabel}
          </Link>
          <ChevronRightIcon />
          <span className="font-medium text-gray-700">{label}</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{label}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
