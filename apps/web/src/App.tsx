import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./components/admin/AdminLayout";
import { Layout } from "./components/Layout";
import { StoreLayout } from "./components/store/StoreLayout";
import { CustomerLayout } from "./components/customer/CustomerLayout";
import { RequireCustomer } from "./components/customer/RequireCustomer";
import { RequireSeller } from "./components/RequireSeller";
import { RequireSuperadmin } from "./components/superadmin/RequireSuperadmin";
import { SuperadminLayout } from "./components/superadmin/SuperadminLayout";
import { AccountHomePage } from "./pages/account/AccountHomePage";
import { AccountSettingsPage } from "./pages/account/AccountSettingsPage";
import { AuthPage } from "./pages/AuthPage";
import { CartPage } from "./pages/CartPage";
import { DashboardHomePage } from "./pages/dashboard/DashboardHomePage";
import { DashboardOrderDetailPage } from "./pages/dashboard/DashboardOrderDetailPage";
import { DashboardOrdersPage } from "./pages/dashboard/DashboardOrdersPage";
import { DashboardProductsPage } from "./pages/dashboard/DashboardProductsPage";
import { DashboardSettingsPage } from "./pages/dashboard/DashboardSettingsPage";
import { DashboardTemplatesPage } from "./pages/dashboard/DashboardTemplatesPage";
import { HomePage } from "./pages/HomePage";
import { MyOrdersPage } from "./pages/MyOrdersPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OrderPage } from "./pages/OrderPage";
import { StorefrontPage } from "./pages/StorefrontPage";
import { SuperadminDashboardPage } from "./pages/superadmin/SuperadminDashboardPage";
import { SuperadminLoginPage } from "./pages/superadmin/SuperadminLoginPage";
import { SuperadminOrdersPage } from "./pages/superadmin/SuperadminOrdersPage";
import { SuperadminStoreDetailPage } from "./pages/superadmin/SuperadminStoreDetailPage";
import { SuperadminStoresPage } from "./pages/superadmin/SuperadminStoresPage";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="signup" element={<AuthPage mode="signup" />} />
        <Route element={<StoreLayout />}>
          <Route path="s/:slug" element={<StorefrontPage />} />
          <Route path="s/:slug/cart" element={<CartPage />} />
        </Route>

        <Route element={<RequireCustomer />}>
          <Route element={<CustomerLayout />}>
            <Route path="account" element={<AccountHomePage />} />
            <Route path="my-orders" element={<MyOrdersPage />} />
            <Route path="o/:orderId" element={<OrderPage />} />
            <Route path="account/settings" element={<AccountSettingsPage />} />
          </Route>
        </Route>
        <Route path="seller/login" element={<Navigate to="/login?role=store" replace />} />

        <Route element={<RequireSeller />}>
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={<DashboardHomePage />} />
            <Route path="dashboard/orders" element={<DashboardOrdersPage />} />
            <Route path="dashboard/orders/:id" element={<DashboardOrderDetailPage />} />
            <Route path="dashboard/products" element={<DashboardProductsPage />} />
            <Route path="dashboard/templates" element={<DashboardTemplatesPage />} />
            <Route path="dashboard/settings" element={<DashboardSettingsPage />} />
          </Route>
        </Route>

        <Route path="superadmin" element={<SuperadminLoginPage />} />

        <Route element={<RequireSuperadmin />}>
          <Route element={<SuperadminLayout />}>
            <Route path="superadmin/dashboard" element={<SuperadminDashboardPage />} />
            <Route path="superadmin/stores" element={<SuperadminStoresPage />} />
            <Route path="superadmin/stores/:id" element={<SuperadminStoreDetailPage />} />
            <Route path="superadmin/orders" element={<SuperadminOrdersPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
