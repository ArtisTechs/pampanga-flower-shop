import { Link } from "react-router";
import type { AdminLowStockFlower } from "../../types/shop";
import { AdminIcon } from "./AdminIcon";

interface AdminLowStockSectionProps {
  flowers: AdminLowStockFlower[];
}

export const AdminLowStockSection = ({ flowers }: AdminLowStockSectionProps) => (
  <section className="admin-ui-panel admin-ui-card-section" aria-labelledby="low-stock-title">
    <header className="admin-ui-section-header">
      <h2 id="low-stock-title">
        <AdminIcon icon="alert" />
        Low Stock
      </h2>
      <Link to="/admin/inventory" className="admin-ui-link-button">Inventory →</Link>
    </header>
    {flowers.length === 0 ? (
      <p className="admin-ui-muted admin-ui-empty-line">✓ All flowers are above their restock level.</p>
    ) : (
      <ul className="admin-ui-stock-list">
        {flowers.map((flower) => (
          <li key={flower.id}>
            <div>
              <strong>{flower.name}</strong>
              <span className="admin-ui-muted">Restock at {flower.threshold}</span>
            </div>
            <span className="admin-ui-badge status-low">{flower.currentStock} left</span>
          </li>
        ))}
      </ul>
    )}
  </section>
);
