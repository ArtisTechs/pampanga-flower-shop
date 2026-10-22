import { Link } from "react-router";
import type { AdminDashboard, AdminDashboardStat } from "../../types/shop";
import { formatPhpCurrency } from "../../utils/currency";
import { AdminIcon } from "./AdminIcon";

interface AdminDashboardStatsProps {
  dashboard: AdminDashboard;
}

// Each card links to the page where the admin acts on that number.
export const AdminDashboardStats = ({ dashboard }: AdminDashboardStatsProps) => {
  const stats: Array<AdminDashboardStat & { href: string; hint: string; alert?: boolean }> = [
    { id: "total-orders", label: "Total Orders", value: String(dashboard.totalOrders), icon: "bag", href: "/admin/orders", hint: "View all orders" },
    { id: "total-sales", label: "Total Sales", value: formatPhpCurrency(dashboard.totalSalesPhp), icon: "peso", href: "/admin/reports", hint: "See reports" },
    { id: "pending-pickups", label: "Waiting for Pick-up", value: String(dashboard.pendingPickups), icon: "clock", href: "/admin/orders?status=Pending", hint: "Prepare orders" },
    {
      id: "low-stock-flowers",
      label: "Low Stock Flowers",
      value: String(dashboard.lowStock.length),
      icon: "alert",
      href: "/admin/inventory?stock=low",
      hint: dashboard.lowStock.length > 0 ? "Restock now" : "All stocked",
      alert: dashboard.lowStock.length > 0
    }
  ];

  return (
    <section className="admin-stats-grid" aria-label="Dashboard totals">
      {stats.map((stat) => (
        <Link className={`admin-stat-card admin-ui-stat-link ${stat.alert ? "is-alert" : ""}`} key={stat.id} to={stat.href}>
          <div>
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
            <span className="admin-ui-stat-hint">{stat.hint} →</span>
          </div>
          <span className="admin-stat-icon">
            <AdminIcon icon={stat.icon} />
          </span>
        </Link>
      ))}
    </section>
  );
};
