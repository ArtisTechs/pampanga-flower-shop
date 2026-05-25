import { adminLowStockFlowers } from "../../data/adminDashboardData";
import { AdminIcon } from "./AdminIcon";

export const AdminLowStockSection = () => (
  <section className="admin-panel admin-low-stock" aria-labelledby="low-stock-title">
    <h2 id="low-stock-title">
      <AdminIcon icon="alert" />
      Low Stock Alert
    </h2>
    <div className="admin-stock-list">
      {adminLowStockFlowers.map((flower) => (
        <article className="admin-stock-card" key={flower.id}>
          <div>
            <h3>{flower.name}</h3>
            <p>Threshold: {flower.threshold}</p>
          </div>
          <span>{flower.currentStock} left</span>
        </article>
      ))}
    </div>
  </section>
);
