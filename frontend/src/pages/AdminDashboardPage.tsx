import { fetchAdminDashboard } from "../api/shop";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminDashboardStats } from "../components/admin/AdminDashboardStats";
import { AdminLowStockSection } from "../components/admin/AdminLowStockSection";
import { AdminRecentOrdersSection } from "../components/admin/AdminRecentOrdersSection";
import { useApiData } from "../hooks/useApiData";
import type { Account } from "../types/shop";

interface AdminDashboardPageProps {
  account: Account;
  onLogout: () => void;
}

export const AdminDashboardPage = ({ account, onLogout }: AdminDashboardPageProps) => {
  const dashboard = useApiData(fetchAdminDashboard, []);

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-dashboard-page">
        <h1>Dashboard</h1>
        {dashboard.data ? (
          <>
            <AdminDashboardStats dashboard={dashboard.data} />
            <div className="admin-dashboard-sections">
              <AdminRecentOrdersSection orders={dashboard.data.recentOrders} />
              <AdminLowStockSection flowers={dashboard.data.lowStock} />
            </div>
          </>
        ) : (
          <LoadState error={dashboard.error} onRetry={dashboard.reload} />
        )}
      </div>
    </AdminLayout>
  );
};
