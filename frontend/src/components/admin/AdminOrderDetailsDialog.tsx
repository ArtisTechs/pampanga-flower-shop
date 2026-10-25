import { useState } from "react";
import { fetchAdminOrder } from "../../api/shop";
import { useApiData } from "../../hooks/useApiData";
import type { AdminOrder, AdminOrderDetail, AdminOrderStatus } from "../../types/shop";
import { resolveImagePath } from "../../utils/assets";
import { formatPhpCurrency } from "../../utils/currency";
import { formatShopDateTime } from "../../utils/dates";
import { CustomBouquetDetails, orderItemBouquetSummary } from "../CustomBouquetDetails";
import { LoadState } from "../LoadState";
import { PaymentStatusBadge } from "../PaymentStatusBadge";
import { AdminDialog, AdminUiIcon } from "./AdminUi";
import { AdminOrderStatusSelect, isPaymentSettled } from "./AdminOrdersTable";

type PaymentReviewHandler = (orderId: string, decision: "Verified" | "Rejected", note?: string) => Promise<boolean>;

const nextStep: Partial<Record<AdminOrderStatus, { status: AdminOrderStatus; label: string }>> = {
  Pending: { status: "Ready", label: "Mark as ready for pick-up" },
  Ready: { status: "Completed", label: "Mark as completed" }
};

interface AdminOrderDetailsDialogProps {
  order: AdminOrder;
  isUpdating: boolean;
  onStatusChange: (orderId: string, status: AdminOrderStatus) => void;
  onPaymentReview: PaymentReviewHandler;
  onClose: () => void;
}

interface PaymentReviewProps {
  order: AdminOrder;
  payment: AdminOrderDetail["payment"];
  isUpdating: boolean;
  onPaymentReview: PaymentReviewHandler;
}

// The customer's screenshot next to the account it was sent to, with verify / reject actions.
const PaymentReview = ({ order, payment, isUpdating, onPaymentReview }: PaymentReviewProps) => {
  const [isRejecting, setIsRejecting] = useState(false);
  const [note, setNote] = useState("");
  const canReview = order.paymentStatus === "For verification";

  const handleReject = async () => {
    if (note.trim() && (await onPaymentReview(order.id, "Rejected", note.trim()))) {
      setIsRejecting(false);
      setNote("");
    }
  };

  return (
    <section className="admin-payment-review" aria-label="Payment">
      <h3 className="admin-ui-section-title">
        Payment <PaymentStatusBadge status={order.paymentStatus} />
      </h3>
      {order.paymentStatus === "Pay on pick-up" ? (
        <p className="admin-ui-muted">Placed before online payment; collect {formatPhpCurrency(order.totalPhp)} on pick-up.</p>
      ) : (
        <div className="admin-payment-review-body">
          {payment.proofUrl ? (
            <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="admin-payment-proof" title="Open full size">
              <img src={resolveImagePath(payment.proofUrl, 600)} alt="Customer's payment screenshot" />
            </a>
          ) : (
            <div className="admin-payment-proof empty">No screenshot uploaded yet</div>
          )}
          <dl className="admin-payment-facts">
            <div>
              <dt>Expected amount</dt>
              <dd>{formatPhpCurrency(order.totalPhp)}</dd>
            </div>
            <div>
              <dt>Sent to</dt>
              <dd>{payment.provider} · {payment.accountName}<br />{payment.accountNumber}</dd>
            </div>
            {payment.submittedAt ? (
              <div>
                <dt>Uploaded</dt>
                <dd>{formatShopDateTime(payment.submittedAt)}</dd>
              </div>
            ) : null}
            {payment.reviewedAt ? (
              <div>
                <dt>Reviewed</dt>
                <dd>{formatShopDateTime(payment.reviewedAt)}</dd>
              </div>
            ) : null}
            {payment.note ? (
              <div>
                <dt>Rejection reason</dt>
                <dd>{payment.note}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      )}

      {canReview && isRejecting ? (
        <div className="admin-payment-reject">
          <label className="admin-product-field">
            <span className="admin-product-label">Reason (shown to the customer) <em>*</em></span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              rows={2}
              placeholder="e.g. Amount doesn't match, or the reference number isn't visible"
              autoFocus
            />
          </label>
          <div className="admin-payment-actions">
            <button type="button" className="admin-products-secondary" onClick={() => setIsRejecting(false)} disabled={isUpdating}>
              Back
            </button>
            <button type="button" className="admin-payment-reject-button" onClick={handleReject} disabled={isUpdating || !note.trim()}>
              {isUpdating ? "Rejecting..." : "Reject payment"}
            </button>
          </div>
        </div>
      ) : canReview ? (
        <div className="admin-payment-actions">
          <button type="button" className="admin-payment-reject-button" onClick={() => setIsRejecting(true)} disabled={isUpdating}>
            Reject
          </button>
          <button type="button" className="admin-products-primary" onClick={() => onPaymentReview(order.id, "Verified")} disabled={isUpdating}>
            {isUpdating ? "Verifying..." : "Verify payment"}
          </button>
        </div>
      ) : null}
    </section>
  );
};

// `order` is the live row from the list (so status changes show immediately); items load separately.
export const AdminOrderDetailsDialog = ({ order, isUpdating, onStatusChange, onPaymentReview, onClose }: AdminOrderDetailsDialogProps) => {
  // Reloaded when the payment status changes so review times and notes stay current.
  const details = useApiData(() => fetchAdminOrder(order.id), [order.id, order.paymentStatus]);
  const step = isPaymentSettled(order) ? nextStep[order.status] : undefined;

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

      {details.data ? (
        <PaymentReview order={order} payment={details.data.payment} isUpdating={isUpdating} onPaymentReview={onPaymentReview} />
      ) : null}

      <h3 className="admin-ui-section-title">Items to prepare</h3>
      {details.data ? (
        <ul className="admin-ui-order-items">
          {details.data.items.map((item) => {
            const summary = orderItemBouquetSummary(item);
            return (
              <li key={item.id}>
                {item.image ? <img src={item.image} alt="" /> : <span className="admin-ui-order-item-placeholder" aria-hidden="true">💐</span>}
                <div>
                  <strong>
                    {item.quantity} × {summary ? `Custom ${summary.size} bouquet` : item.name}
                  </strong>
                  {summary ? <CustomBouquetDetails summary={summary} className="admin-ui-bouquet-details" /> : null}
                </div>
                <span className="admin-ui-order-item-price">{formatPhpCurrency(item.unitPricePhp * item.quantity)}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <LoadState error={details.error} onRetry={details.reload} />
      )}

      <p className="admin-ui-order-total">
        <span>{order.paymentStatus === "Pay on pick-up" ? "Total due on pick-up" : "Total"}</span>
        <strong>{formatPhpCurrency(order.totalPhp)}</strong>
      </p>
    </AdminDialog>
  );
};
