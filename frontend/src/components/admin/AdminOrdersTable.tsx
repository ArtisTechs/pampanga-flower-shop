import { formatPhpCurrency } from "../../utils/currency";
import { formatShopDateTime } from "../../utils/dates";
import type { AdminOrder, AdminOrderStatus } from "../../types/shop";
import { PaymentStatusBadge } from "../PaymentStatusBadge";
import { AdminUiIcon } from "./AdminUi";

export const ORDER_STATUSES: AdminOrderStatus[] = ["Pending", "Ready", "Completed"];

// The shop only prepares orders whose payment is verified (or, for older orders, paid on pick-up).
export const isPaymentSettled = (order: AdminOrder) =>
  order.paymentStatus === "Verified" || order.paymentStatus === "Pay on pick-up";

interface AdminOrderStatusSelectProps {
  order: AdminOrder;
  disabled: boolean;
  onStatusChange: (orderId: string, status: AdminOrderStatus) => void;
}

// A status pill that is also the control for changing it.
export const AdminOrderStatusSelect = ({ order, disabled, onStatusChange }: AdminOrderStatusSelectProps) => (
  <select
    className={`admin-ui-status-select status-${order.status.toLowerCase()}`}
    value={order.status}
    disabled={disabled}
    onChange={(event) => onStatusChange(order.id, event.target.value as AdminOrderStatus)}
    aria-label={`Status of ${order.customerName}'s order`}
  >
    {ORDER_STATUSES.map((status) => (
      <option value={status} key={status} disabled={status !== "Pending" && !isPaymentSettled(order)}>{status}</option>
    ))}
  </select>
);

interface AdminOrdersTableProps {
  orders: AdminOrder[];
  updatingOrderId: string | null;
  onStatusChange: (orderId: string, status: AdminOrderStatus) => void;
  onView: (order: AdminOrder) => void;
}

export const AdminOrdersTable = ({ orders, updatingOrderId, onStatusChange, onView }: AdminOrdersTableProps) => (
  <section className="admin-ui-panel" aria-label="Orders">
    <table className="admin-ui-table">
      <thead>
        <tr>
          <th>Customer</th>
          <th>Size</th>
          <th>Pick-up</th>
          <th className="numeric">Total</th>
          <th>Payment</th>
          <th>Status</th>
          <th><span className="visually-hidden">Details</span></th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td data-label="Customer">
              <strong>{order.customerName}</strong>
              <span className="admin-ui-muted">{order.contactNumber}</span>
            </td>
            <td data-label="Size">{order.bouquetSize ?? "Catalog items"}</td>
            <td data-label="Pick-up">{formatShopDateTime(order.pickupAt)}</td>
            <td data-label="Total" className="numeric"><strong>{formatPhpCurrency(order.totalPhp)}</strong></td>
            <td data-label="Payment"><PaymentStatusBadge status={order.paymentStatus} /></td>
            <td data-label="Status">
              <AdminOrderStatusSelect order={order} disabled={updatingOrderId === order.id} onStatusChange={onStatusChange} />
            </td>
            <td className="admin-ui-row-action">
              <button type="button" className="admin-ui-link-button" onClick={() => onView(order)}>
                View
                <AdminUiIcon name="arrow-right" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);
