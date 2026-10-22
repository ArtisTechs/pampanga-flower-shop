import { fetchAdminDashboard } from "../api/shop";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminDashboardStats } from "../components/admin/AdminDashboardStats";
import { AdminLowStockSection } from "../components/admin/AdminLowStockSection";
import { AdminRecentOrdersSection } from "../components/admin/AdminRecentOrdersSection";
import { AdminPageHeader } from "../components/admin/AdminUi";
import { useApiData } from "../hooks/useApiData";
import type { Account } from "../types/shop";

interface AdminDashboardPageProps {
  account: Account;
  onLogout: () => void;
}

export const AdminDashboardPage = ({ account, onLogout }: AdminDashboardPageProps) => {
  const dashboard = useApiData(fetchAdminDashboard, []);
  const firstName = account.fullName.split(" ")[0];

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-products-page admin-dashboard-page">
        <AdminPageHeader title="Dashboard" subtitle={`Welcome back, ${firstName}. Here's how the shop is doing.`} />
        {dashboard.data ? (
          <>
            <AdminDashboardStats dashboard={dashboard.data} />
            <div className="admin-ui-dashboard-sections">
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
