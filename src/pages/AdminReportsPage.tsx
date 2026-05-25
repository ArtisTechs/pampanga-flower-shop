import { AdminLayout } from "../components/admin/AdminLayout";
import type { MockAccount } from "../types/shop";

interface ReportStat {
  id: string;
  label: string;
  value: string;
  icon: "orders" | "revenue" | "average";
}

interface PopularFlower {
  id: string;
  name: string;
  orders: number;
}

const reportStats: ReportStat[] = [
  { id: "total-orders", label: "Total Orders", value: "3", icon: "orders" },
  { id: "total-revenue", label: "Total Revenue", value: "₱6,720", icon: "revenue" },
  { id: "average-order", label: "Avg. Order Value", value: "₱2,240", icon: "average" }
];

const popularFlowers: PopularFlower[] = [
  { id: "roses", name: "Roses", orders: 2 },
  { id: "peonies", name: "Peonies", orders: 1 },
  { id: "tulips", name: "Tulips", orders: 1 },
  { id: "sunflowers", name: "Sunflowers", orders: 1 }
];

interface AdminReportsPageProps {
  account: MockAccount;
  onLogout: () => void;
}

export const AdminReportsPage = ({ account, onLogout }: AdminReportsPageProps) => {
  const maxOrders = Math.max(...popularFlowers.map((item) => item.orders));

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-reports-page">
        <h1>Reports</h1>

        <section className="admin-reports-stats" aria-label="Report overview">
          {reportStats.map((stat, index) => (
            <article
              key={stat.id}
              className={`admin-report-stat-card ${index === 2 ? "admin-report-stat-card-wide" : ""}`}
            >
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
              <span className="admin-report-stat-icon" aria-hidden="true">
                {stat.icon === "orders" ? (
                  <svg viewBox="0 0 24 24">
                    <path d="M7 8h10l1 12H6z" />
                    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                    <path d="M11 13h2" />
                  </svg>
                ) : null}
                {stat.icon === "revenue" ? (
                  <svg viewBox="0 0 24 24">
                    <path d="M8 4h6.2a4.8 4.8 0 0 1 0 9.6H8" />
                    <path d="M8 4v16" />
                    <path d="M5 8h11" />
                    <path d="M5 12h11" />
                  </svg>
                ) : null}
                {stat.icon === "average" ? (
                  <svg viewBox="0 0 24 24">
                    <path d="m4 16 5-5 4 4 7-7" />
                    <path d="M20 8v5h-5" />
                  </svg>
                ) : null}
              </span>
            </article>
          ))}
        </section>

        <section className="admin-report-popular-flowers" aria-label="Most popular flowers">
          <h2>Most Popular Flowers</h2>
          <div className="admin-report-popular-list">
            {popularFlowers.map((flower) => (
              <article key={flower.id} className="admin-report-popular-item">
                <div className="admin-report-popular-item-top">
                  <span>{flower.name}</span>
                  <span>{flower.orders} {flower.orders === 1 ? "order" : "orders"}</span>
                </div>
                <div className="admin-report-popular-track" aria-hidden="true">
                  <span style={{ width: `${(flower.orders / maxOrders) * 100}%` }} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};
