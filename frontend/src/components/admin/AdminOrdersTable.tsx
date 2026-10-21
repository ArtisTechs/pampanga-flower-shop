import { formatPhpCurrency } from "../../utils/currency";
import { formatShopDateTime } from "../../utils/dates";
import type { AdminOrder, AdminOrderStatus } from "../../types/shop";

interface AdminOrdersTableProps {
  orders: AdminOrder[];
  updatingOrderId: string | null;
  onStatusChange: (orderId: string, status: AdminOrderStatus) => void;
}

const nextStatusOptions: AdminOrderStatus[] = ["Pending", "Ready", "Completed"];

export const AdminOrdersTable = ({ orders, updatingOrderId, onStatusChange }: AdminOrdersTableProps) => (
  <section className="admin-orders-panel" aria-label="Orders management table">
    <div className="admin-orders-management-table-wrap">
      <table className="admin-orders-management-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Contact</th>
            <th>Size</th>
            <th>Pickup Date</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={7}>No orders found.</td>
            </tr>
          ) : null}
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{order.customerName}</td>
              <td>{order.contactNumber}</td>
              <td>{order.bouquetSize ?? "—"}</td>
              <td>{formatShopDateTime(order.pickupAt)}</td>
              <td>{formatPhpCurrency(order.totalPhp)}</td>
              <td>
                <span className={`admin-status admin-status-${order.status.toLowerCase().replace(" ", "-")}`}>
                  {order.status}
                </span>
              </td>
              <td>
                <div className="admin-order-actions">
                  <button type="button" aria-label={`View ${order.customerName} order`}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5z" />
                      <circle cx="12" cy="12" r="2.4" />
                    </svg>
                  </button>
                  <select
                    aria-label={`Update ${order.customerName} order status`}
                    value=""
                    disabled={updatingOrderId === order.id}
                    onChange={(event) => onStatusChange(order.id, event.target.value as AdminOrderStatus)}
                  >
                    <option value="" disabled>Update</option>
                    {nextStatusOptions.map((status) => (
                      <option value={status} key={status} disabled={status === order.status}>{status}</option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);
