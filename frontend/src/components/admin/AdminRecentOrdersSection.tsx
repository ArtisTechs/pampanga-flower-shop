import { Link } from "react-router";
import type { AdminOrder } from "../../types/shop";
import { formatPhpCurrency } from "../../utils/currency";
import { formatShopDateTime } from "../../utils/dates";

interface AdminRecentOrdersSectionProps {
  orders: AdminOrder[];
}

export const AdminRecentOrdersSection = ({ orders }: AdminRecentOrdersSectionProps) => (
  <section className="admin-ui-panel admin-ui-card-section" aria-labelledby="recent-orders-title">
    <header className="admin-ui-section-header">
      <h2 id="recent-orders-title">Recent Orders</h2>
      <Link to="/admin/orders" className="admin-ui-link-button">View all →</Link>
    </header>
    {orders.length === 0 ? (
      <p className="admin-ui-muted admin-ui-empty-line">No orders yet.</p>
    ) : (
      <table className="admin-ui-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Pick-up</th>
            <th className="numeric">Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td data-label="Customer">
                <strong>{order.customerName}</strong>
                <span className="admin-ui-muted">{order.bouquetSize ? `${order.bouquetSize} bouquet` : "Catalog items"}</span>
              </td>
              <td data-label="Pick-up">{formatShopDateTime(order.pickupAt)}</td>
              <td data-label="Total" className="numeric">{formatPhpCurrency(order.totalPhp)}</td>
              <td data-label="Status">
                <span className={`admin-ui-badge status-${order.status.toLowerCase()}`}>{order.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </section>
);
