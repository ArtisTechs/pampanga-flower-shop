import { fetchAdminOrder } from "../../api/shop";
import { useApiData } from "../../hooks/useApiData";
import type { AdminOrder, AdminOrderStatus } from "../../types/shop";
import { formatPhpCurrency } from "../../utils/currency";
import { formatShopDateTime } from "../../utils/dates";
import { LoadState } from "../LoadState";
import { AdminDialog, AdminUiIcon } from "./AdminUi";
import { AdminOrderStatusSelect } from "./AdminOrdersTable";

const nextStep: Partial<Record<AdminOrderStatus, { status: AdminOrderStatus; label: string }>> = {
  Pending: { status: "Ready", label: "Mark as ready for pick-up" },
  Ready: { status: "Completed", label: "Mark as completed" }
};

interface AdminOrderDetailsDialogProps {
  order: AdminOrder;
  isUpdating: boolean;
  onStatusChange: (orderId: string, status: AdminOrderStatus) => void;
  onClose: () => void;
}

// `order` is the live row from the list (so status changes show immediately); items load separately.
export const AdminOrderDetailsDialog = ({ order, isUpdating, onStatusChange, onClose }: AdminOrderDetailsDialogProps) => {
  const details = useApiData(() => fetchAdminOrder(order.id), [order.id]);
  const step = nextStep[order.status];

  return (
    <AdminDialog
      title={`Order for ${order.customerName}`}
      subtitle={details.data ? `Placed ${formatShopDateTime(details.data.createdAt)}` : "Order details"}
      onClose={onClose}
      isBusy={isUpdating}
      size="narrow"
      footer={
        <>
          <button type="button" className="admin-products-secondary" onClick={onClose}>Close</button>
          {step ? (
            <button
              type="button"
              className="admin-products-primary"
              onClick={() => onStatusChange(order.id, step.status)}
              disabled={isUpdating}
            >
              {isUpdating ? "Updating..." : step.label}
            </button>
          ) : null}
        </>
      }
    >
      <dl className="admin-ui-facts">
        <div>
          <dt><AdminUiIcon name="calendar" /> Pick-up</dt>
          <dd>{formatShopDateTime(order.pickupAt)}</dd>
        </div>
        <div>
          <dt><AdminUiIcon name="phone" /> Contact</dt>
          <dd><a href={`tel:${order.contactNumber.replace(/\s+/g, "")}`}>{order.contactNumber}</a></dd>
        </div>
        {details.data?.customerEmail ? (
          <div>
            <dt><AdminUiIcon name="mail" /> Email</dt>
            <dd><a href={`mailto:${details.data.customerEmail}`}>{details.data.customerEmail}</a></dd>
          </div>
        ) : null}
        <div>
          <dt>Status</dt>
          <dd><AdminOrderStatusSelect order={order} disabled={isUpdating} onStatusChange={onStatusChange} /></dd>
        </div>
      </dl>

      <h3 className="admin-ui-section-title">Items to prepare</h3>
      {details.data ? (
        <ul className="admin-ui-order-items">
          {details.data.items.map((item) => (
            <li key={item.id}>
              {item.image ? <img src={item.image} alt="" /> : <span className="admin-ui-order-item-placeholder" aria-hidden="true">💐</span>}
              <div>
                <strong>
                  {item.quantity} × {item.customization ? `Custom ${item.customization.size} bouquet` : item.name}
                </strong>
                {item.customization ? (
                  <p className="admin-ui-chips">
                    <span>{item.customization.palette}</span>
                    <span>{item.customization.wrap}</span>
                    <span>{item.customization.ribbon}</span>
                  </p>
                ) : null}
                {item.flowers.length > 0 ? (
                  <p className="admin-ui-muted">
                    Flowers: {item.flowers.map((flower) => `${flower.name} × ${flower.quantity}`).join(", ")}
                  </p>
                ) : null}
              </div>
              <span className="admin-ui-order-item-price">{formatPhpCurrency(item.unitPricePhp * item.quantity)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <LoadState error={details.error} onRetry={details.reload} />
      )}

      <p className="admin-ui-order-total">
        <span>Total due on pick-up</span>
        <strong>{formatPhpCurrency(order.totalPhp)}</strong>
      </p>
    </AdminDialog>
  );
};
