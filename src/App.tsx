import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { AppToast, type ToastMessage, type ToastTone } from "./components/AppToast";
import { LoginOverlay } from "./components/LoginOverlay";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { navItems } from "./data/homeData";
import { useAuth } from "./hooks/useAuth";
import { useRevealOnScroll } from "./hooks/useRevealOnScroll";
import type { CartItem, ProductItem } from "./types/shop";
import { AdminBouquetBuilderPage } from "./pages/AdminBouquetBuilderPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminInventoryPage } from "./pages/AdminInventoryPage";
import { AdminOrdersPage } from "./pages/AdminOrdersPage";
import { AdminReportsPage } from "./pages/AdminReportsPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { AdminWebsiteContentPage } from "./pages/AdminWebsiteContentPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { CustomizeOrderPage } from "./pages/CustomizeOrderPage";
import { HomePage } from "./pages/HomePage";
import { ProductListingPage } from "./pages/ProductListingPage";

function App() {
  const { currentAccount, isLoggedIn, login, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const showShadow = useRevealOnScroll();
  const isHome = location.pathname === "/";
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartAnimationKey, setCartAnimationKey] = useState(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const isCustomerLoggedIn = isLoggedIn && !!currentAccount;
  const headerItems = isHome
    ? navItems.map((item) =>
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

    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...currentItems, { ...product, quantity }];
    });
    setCartAnimationKey((currentKey) => currentKey + 1);
    return true;
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((currentItems) => currentItems.filter((item) => item.id !== productId));
  };

  const handleConfirmOrder = () => {
    setCartItems([]);
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

  const handleLogin = (email: string, password: string): boolean => {
    const didLogin = login(email, password);

    if (didLogin) {
      const redirectTo = typeof location.state === "object"
        && location.state !== null
        && "from" in location.state
        && typeof location.state.from === "string"
          ? location.state.from
          : "/";

      navigate(redirectTo, { replace: true });
    }

    return didLogin;
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

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
            element={<AdminOrdersPage account={currentAccount} onLogout={logout} />}
          />
          <Route
            path="/admin/bouquet-builder"
            element={<AdminBouquetBuilderPage account={currentAccount} onLogout={logout} />}
          />
          <Route
            path="/admin/inventory"
            element={<AdminInventoryPage account={currentAccount} onLogout={logout} />}
          />
          <Route
            path="/admin/users"
            element={<AdminUsersPage account={currentAccount} onLogout={logout} />}
          />
          <Route
            path="/admin/website-content"
            element={<AdminWebsiteContentPage account={currentAccount} onLogout={logout} />}
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
        items={headerItems}
        showShadow={showShadow}
        onLogout={logout}
        showLogout={isCustomerLoggedIn}
        onLoginClick={() => navigate("/login")}
        cartCount={cartCount}
        cartAnimationKey={cartAnimationKey}
      />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage onRequireLogin={handleRequireLogin} isLoggedIn={isCustomerLoggedIn} />} />
          <Route
            path="/login"
            element={
              isCustomerLoggedIn
                ? <Navigate to="/" replace />
                : <LoginOverlay onLogin={handleLogin} onToast={showToast} />
            }
          />
          <Route
            path="/cart"
            element={
              isCustomerLoggedIn
                ? <CartPage items={cartItems} onRemoveItem={handleRemoveFromCart} />
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
                    onConfirmOrder={handleConfirmOrder}
                  />
                )
                : <Navigate to="/login" replace state={{ from: "/checkout" }} />
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
      <SiteFooter />
      <AppToast toast={toast} />
    </>
  );
}

export default App;
