import type { AdminLowStockFlower } from "../../types/shop";
import { AdminIcon } from "./AdminIcon";

interface AdminLowStockSectionProps {
  flowers: AdminLowStockFlower[];
}

export const AdminLowStockSection = ({ flowers }: AdminLowStockSectionProps) => (
  <section className="admin-panel admin-low-stock" aria-labelledby="low-stock-title">
    <h2 id="low-stock-title">
      <AdminIcon icon="alert" />
      Low Stock Alert
    </h2>
    <div className="admin-stock-list">
      {flowers.length === 0 ? <p>All flowers are above their stock threshold.</p> : null}
      {flowers.map((flower) => (
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
