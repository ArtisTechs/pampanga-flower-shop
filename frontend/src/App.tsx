import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { AppToast, type ToastMessage, type ToastTone } from "./components/AppToast";
import { LoginOverlay } from "./components/LoginOverlay";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { siteNavItems } from "./components/siteNavigation";
import { fetchSiteContent } from "./api/shop";
import { useApiData } from "./hooks/useApiData";
import { useAuth } from "./hooks/useAuth";
import { useCart } from "./hooks/useCart";
import { useRevealOnScroll } from "./hooks/useRevealOnScroll";
import type { ProductItem, RegisterInput, ResetPasswordInput } from "./types/shop";
import { AdminBouquetBuilderPage } from "./pages/AdminBouquetBuilderPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminInventoryPage } from "./pages/AdminInventoryPage";
import { AdminOrdersPage } from "./pages/AdminOrdersPage";
import { AdminPaymentMethodsPage } from "./pages/AdminPaymentMethodsPage";
import { AdminProductsPage } from "./pages/AdminProductsPage";
import { AdminReportsPage } from "./pages/AdminReportsPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { AdminWebsiteContentPage } from "./pages/AdminWebsiteContentPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { CustomizeOrderPage } from "./pages/CustomizeOrderPage";
import { HomePage } from "./pages/HomePage";
import { MyOrdersPage } from "./pages/MyOrdersPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProductListingPage } from "./pages/ProductListingPage";

function App() {
  const { currentAccount, isAuthLoading, isLoggedIn, login, register, resetPassword, logout, updateAccount } = useAuth();
  const siteContentState = useApiData(fetchSiteContent, []);
  const siteContent = siteContentState.data;
  const location = useLocation();
  const navigate = useNavigate();
  const showShadow = useRevealOnScroll();
  const isHome = location.pathname === "/";
  const isCustomerLoggedIn = isLoggedIn && !!currentAccount;
  const cart = useCart(isLoggedIn && currentAccount?.role === "user" ? currentAccount.id : null);
  const cartItems = cart.items;
  const [cartAnimationKey, setCartAnimationKey] = useState(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const headerItems = isHome
    ? siteNavItems.map((item) =>
        item.label === "Start Customizing" ? { ...item, href: "/customize" } : item
      )
    : [{ label: "Home", href: "/" }];
  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );

  const handleAddToCart = (product: ProductItem, quantity: number) => {
    if (quantity <= 0) {
      return false;
    }

    if (!isCustomerLoggedIn) {
      navigate("/login", { state: { from: location.pathname + location.search } });
      showToast("Please log in to add items to your cart.", "error");
      return false;
    }

    cart.addItem(product, quantity);
    setCartAnimationKey((currentKey) => currentKey + 1);
    return true;
  };

  const handleOrderPlaced = () => {
    cart.clear();
    setCartAnimationKey((currentKey) => currentKey + 1);
    showToast("Order placed successfully.", "success");
  };

  const showToast = (message: string, tone: ToastTone) => {
    setToast({ id: Date.now(), message, tone });
  };

  const handleRequireLogin = () => {
    if (!isCustomerLoggedIn) {
      navigate("/login", { state: { from: "/customize" } });
      showToast("Please log in to start customizing.", "error");
      return false;
    }

    return true;
  };

  const redirectAfterLogin = () => {
    const redirectTo = typeof location.state === "object"
      && location.state !== null
      && "from" in location.state
      && typeof location.state.from === "string"
        ? location.state.from
        : "/";

    navigate(redirectTo, { replace: true });
  };

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    redirectAfterLogin();
  };

  const handleRegister = async (input: RegisterInput) => {
    await register(input);
    redirectAfterLogin();
  };

  const handleResetPassword = async (input: ResetPasswordInput) => {
    await resetPassword(input);
    redirectAfterLogin();
  };

  useEffect(() => {
    // Honour "/#section" links from other pages (the router doesn't scroll to hashes itself).
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;

    if (target) {
      target.scrollIntoView({ behavior: "auto" });
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  if (isAuthLoading) {
    return null;
  }

  if (isLoggedIn && currentAccount?.role === "admin") {
    return (
      <>
        <Routes>
          <Route
            path="/admin/dashboard"
            element={<AdminDashboardPage account={currentAccount} onLogout={logout} />}
          />
          <Route
            path="/admin/orders"
            element={<AdminOrdersPage account={currentAccount} onLogout={logout} onToast={showToast} />}
          />
          <Route
            path="/admin/payments"
            element={<AdminPaymentMethodsPage account={currentAccount} onLogout={logout} onToast={showToast} />}
          />
          <Route
            path="/admin/products"
            element={<AdminProductsPage account={currentAccount} onLogout={logout} onToast={showToast} />}
          />
          <Route
            path="/admin/bouquet-builder"
            element={<AdminBouquetBuilderPage account={currentAccount} onLogout={logout} onToast={showToast} />}
          />
          <Route
            path="/admin/inventory"
            element={<AdminInventoryPage account={currentAccount} onLogout={logout} onToast={showToast} />}
          />
          <Route
            path="/admin/users"
            element={<AdminUsersPage account={currentAccount} onLogout={logout} onToast={showToast} />}
          />
          <Route
            path="/admin/website-content"
            element={<AdminWebsiteContentPage account={currentAccount} onLogout={logout} onToast={showToast} />}
          />
          <Route
            path="/admin/reports"
            element={<AdminReportsPage account={currentAccount} onLogout={logout} />}
          />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
        <AppToast toast={toast} />
      </>
    );
  }

  return (
    <>
      <SiteHeader
        shopName={siteContent?.shopName ?? ""}
        items={headerItems}
        showShadow={showShadow}
        onLogout={logout}
        showLogout={isCustomerLoggedIn}
        onLoginClick={() => navigate("/login")}
        account={isCustomerLoggedIn ? currentAccount : null}
        cartCount={cartCount}
        cartAnimationKey={cartAnimationKey}
      />
      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                onRequireLogin={handleRequireLogin}
                isLoggedIn={isCustomerLoggedIn}
                siteContent={siteContent}
                siteContentError={siteContentState.error}
                onRetrySiteContent={siteContentState.reload}
              />
            }
          />
          <Route
            path="/login"
            element={
              isCustomerLoggedIn
                ? <Navigate to="/" replace />
                : <LoginOverlay shopName={siteContent?.shopName ?? ""} onLogin={handleLogin} onRegister={handleRegister} onResetPassword={handleResetPassword} onToast={showToast} />
            }
          />
          <Route
            path="/cart"
            element={
              isCustomerLoggedIn
                ? <CartPage items={cartItems} onRemoveItem={cart.removeItem} onUpdateQuantity={cart.setItemQuantity} />
                : <Navigate to="/login" replace state={{ from: "/cart" }} />
            }
          />
          <Route
            path="/checkout"
            element={
              isCustomerLoggedIn && currentAccount
                ? (
                  <CheckoutPage
                    account={currentAccount}
                    items={cartItems}
                    siteContent={siteContent}
                    onOrderPlaced={handleOrderPlaced}
                  />
                )
                : <Navigate to="/login" replace state={{ from: "/checkout" }} />
            }
          />
          <Route
            path="/orders"
            element={
              isCustomerLoggedIn
                ? <MyOrdersPage />
                : <Navigate to="/login" replace state={{ from: "/orders" }} />
            }
          />
          <Route
            path="/profile"
            element={
              isCustomerLoggedIn && currentAccount
                ? <ProfilePage account={currentAccount} onAccountUpdated={updateAccount} onToast={showToast} />
                : <Navigate to="/login" replace state={{ from: "/profile" }} />
            }
          />
          <Route
            path="/customize"
            element={
              isCustomerLoggedIn
                ? <CustomizeOrderPage onAddToCart={handleAddToCart} onToast={showToast} />
                : <Navigate to="/login" replace state={{ from: "/customize" }} />
            }
          />
          <Route path="/:scope/:id" element={<ProductListingPage onAddToCart={handleAddToCart} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <SiteFooter siteContent={siteContent} />
      <AppToast toast={toast} />
    </>
  );
}

export default App;
