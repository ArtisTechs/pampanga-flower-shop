import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminDashboardStats } from "../components/admin/AdminDashboardStats";
import { AdminLowStockSection } from "../components/admin/AdminLowStockSection";
import { AdminRecentOrdersSection } from "../components/admin/AdminRecentOrdersSection";
import type { MockAccount } from "../types/shop";

interface AdminDashboardPageProps {
  account: MockAccount;
  onLogout: () => void;
}

export const AdminDashboardPage = ({ account, onLogout }: AdminDashboardPageProps) => (
  <AdminLayout account={account} onLogout={onLogout}>
    <div className="admin-page admin-dashboard-page">
      <h1>Dashboard</h1>
      <AdminDashboardStats />
      <div className="admin-dashboard-sections">
        <AdminRecentOrdersSection />
        <AdminLowStockSection />
      </div>
    </div>
  </AdminLayout>
);
