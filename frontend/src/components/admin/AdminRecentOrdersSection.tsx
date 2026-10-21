import type { AdminOrder } from "../../types/shop";
import { formatPhpCurrency } from "../../utils/currency";
import { formatShopDateTime } from "../../utils/dates";

interface AdminRecentOrdersSectionProps {
  orders: AdminOrder[];
}

export const AdminRecentOrdersSection = ({ orders }: AdminRecentOrdersSectionProps) => (
  <section className="admin-panel admin-recent-orders" aria-labelledby="recent-orders-title">
    <h2 id="recent-orders-title">Recent Orders</h2>
    <div className="admin-table-wrap">
      <table className="admin-orders-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Size</th>
            <th>Pickup</th>
            <th>Price</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={5}>No orders yet.</td>
            </tr>
          ) : null}
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{order.customerName}</td>
              <td>{order.bouquetSize ?? "—"}</td>
              <td>{formatShopDateTime(order.pickupAt)}</td>
              <td>{formatPhpCurrency(order.totalPhp)}</td>
              <td>
                <span className={`admin-status admin-status-${order.status.toLowerCase()}`}>
                  {order.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);
