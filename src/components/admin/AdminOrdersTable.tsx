import { formatPhpCurrency } from "../../utils/currency";
import type { AdminOrderManagementItem, AdminOrderStatus } from "../../types/shop";

interface AdminOrdersTableProps {
  orders: AdminOrderManagementItem[];
}

const nextStatusOptions: AdminOrderStatus[] = ["Pending", "Ready", "Completed"];

export const AdminOrdersTable = ({ orders }: AdminOrdersTableProps) => (
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
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{order.customerName}</td>
              <td>{order.contactNumber}</td>
              <td>{order.bouquetSize}</td>
              <td>{order.pickupDate}</td>
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
                  <select aria-label={`Update ${order.customerName} order status`} defaultValue="">
                    <option value="" disabled>Update</option>
                    {nextStatusOptions.map((status) => (
                      <option value={status} key={status}>{status}</option>
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
