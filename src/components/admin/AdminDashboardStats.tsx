import { adminDashboardStats } from "../../data/adminDashboardData";
import { AdminIcon } from "./AdminIcon";

export const AdminDashboardStats = () => (
  <section className="admin-stats-grid" aria-label="Dashboard totals">
    {adminDashboardStats.map((stat) => (
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
