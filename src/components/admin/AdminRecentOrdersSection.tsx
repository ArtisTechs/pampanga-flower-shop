import { adminRecentOrders } from "../../data/adminDashboardData";
import { formatPhpCurrency } from "../../utils/currency";

export const AdminRecentOrdersSection = () => (
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
          {adminRecentOrders.map((order) => (
            <tr key={order.id}>
              <td>{order.customerName}</td>
              <td>{order.bouquetSize}</td>
              <td>{order.pickupSchedule}</td>
              <td>{formatPhpCurrency(order.pricePhp)}</td>
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
