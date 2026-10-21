import type { AdminDashboard, AdminDashboardStat } from "../../types/shop";
import { formatPhpCurrency } from "../../utils/currency";
import { AdminIcon } from "./AdminIcon";

interface AdminDashboardStatsProps {
  dashboard: AdminDashboard;
}

export const AdminDashboardStats = ({ dashboard }: AdminDashboardStatsProps) => {
  const stats: AdminDashboardStat[] = [
    { id: "total-orders", label: "Total Orders", value: String(dashboard.totalOrders), icon: "bag" },
    { id: "total-sales", label: "Total Sales", value: formatPhpCurrency(dashboard.totalSalesPhp), icon: "peso" },
    { id: "pending-pickups", label: "Pending Pickups", value: String(dashboard.pendingPickups), icon: "clock" },
    { id: "low-stock-flowers", label: "Low Stock Flowers", value: String(dashboard.lowStock.length), icon: "alert" }
  ];

  return (
    <section className="admin-stats-grid" aria-label="Dashboard totals">
      {stats.map((stat) => (
        <article className="admin-stat-card" key={stat.id}>
          <div>
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
          </div>
          <span className="admin-stat-icon">
            <AdminIcon icon={stat.icon} />
          </span>
        </article>
      ))}
    </section>
  );
};
