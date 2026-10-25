import { useState } from "react";
import { Link } from "react-router";
import { errorMessage } from "../api/client";
import { fetchMyOrder, fetchMyOrders, uploadPaymentProof } from "../api/shop";
import { CustomBouquetDetails, orderItemBouquetSummary } from "../components/CustomBouquetDetails";
import { LoadState } from "../components/LoadState";
import { PaymentAccountCard } from "../components/PaymentMethodPicker";
import { PaymentProofInput } from "../components/PaymentProofInput";
import { PaymentStatusBadge } from "../components/PaymentStatusBadge";
import { useApiData } from "../hooks/useApiData";
import type { AdminOrderStatus, CustomerOrder, PaymentStatus } from "../types/shop";
import { formatPhpCurrency } from "../utils/currency";
import { formatShopDateTime } from "../utils/dates";

const TRACK_STEPS: Array<{ status: AdminOrderStatus; label: string; message: string }> = [
  { status: "Pending", label: "Order placed", message: "We received your order and are preparing your bouquet." },
  { status: "Ready", label: "Ready for pick-up", message: "Your bouquet is ready for pick-up at the shop." },
  { status: "Completed", label: "Picked up", message: "Order complete. Thank you for choosing us!" }
];

// While the payment isn't verified, the order waits on that instead of the bouquet.
const PAYMENT_MESSAGES: Partial<Record<PaymentStatus, string>> = {
  "Awaiting payment": "Send your payment and upload the screenshot so we can start on your bouquet.",
  "For verification": "We received your payment screenshot and are verifying it.",
  Rejected: "We couldn't verify your payment. Please check the reason below and upload a new screenshot."
};

const shortOrderId = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

const OrderTracker = ({ status }: { status: AdminOrderStatus }) => {
  const currentStep = TRACK_STEPS.findIndex((step) => step.status === status);

  return (
    <ol className="order-tracker" aria-label="Order progress">
      {TRACK_STEPS.map((step, index) => (
        <li
          key={step.status}
          className={`order-tracker-step ${index <= currentStep ? "done" : ""} ${index === currentStep ? "current" : ""}`}
          aria-current={index === currentStep ? "step" : undefined}
        >
          <span className="order-tracker-dot" aria-hidden="true" />
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  );
};

const OrderDetails = ({ orderId }: { orderId: string }) => {
  const { data: order, error, isLoading, reload } = useApiData(() => fetchMyOrder(orderId), [orderId]);

  if (!order || isLoading) {
    return <LoadState error={error} onRetry={reload} className="my-order-details-state" />;
  }

  return (
    <ul className="my-order-items">
      {order.items.map((item) => {
        const summary = orderItemBouquetSummary(item);
        return (
          <li key={item.id} className="my-order-item">
            {item.image ? <img src={item.image} alt="" /> : <span className="my-order-item-placeholder" aria-hidden="true">✿</span>}
            <div>
              <h3>{summary ? `Custom ${summary.size} Bouquet` : item.name}</h3>
              {summary ? <CustomBouquetDetails summary={summary} className="my-order-item-details" /> : null}
            </div>
            <span className="my-order-item-qty">×{item.quantity}</span>
            <strong>{formatPhpCurrency(item.unitPricePhp * item.quantity)}</strong>
          </li>
        );
      })}
    </ul>
  );
};

const PaymentProofForm = ({ order, onUpdated }: { order: CustomerOrder; onUpdated: (order: CustomerOrder) => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file || isUploading) {
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      onUpdated(await uploadPaymentProof(order.id, file));
    } catch (uploadError) {
      setError(errorMessage(uploadError));
      setIsUploading(false);
    }
  };

  return (
    <div className="my-order-payment">
      {order.paymentStatus === "Rejected" && order.paymentNote ? (
        <p className="my-order-payment-note"><strong>Reason:</strong> {order.paymentNote}</p>
      ) : null}
      {order.payment ? (
        <>
          <p className="my-order-payment-label">Pay {formatPhpCurrency(order.totalPhp)} to</p>
          <PaymentAccountCard account={order.payment} />
        </>
      ) : null}
      <PaymentProofInput file={file} onChange={setFile} disabled={isUploading} />
      {error ? <p className="payment-proof-error" role="alert">{error}</p> : null}
      <button type="button" className="my-order-toggle" onClick={handleUpload} disabled={!file || isUploading}>
        {isUploading ? "Uploading..." : "Send screenshot"}
      </button>
    </div>
  );
};

const OrderCard = ({ order, onUpdated }: { order: CustomerOrder; onUpdated: (order: CustomerOrder) => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const step = TRACK_STEPS.find((entry) => entry.status === order.status);
  const message = PAYMENT_MESSAGES[order.paymentStatus] ?? step?.message;
  const needsProof = order.paymentStatus === "Awaiting payment" || order.paymentStatus === "Rejected";
  const detailsId = `order-details-${order.id}`;

  return (
    <article className="my-order-card">
      <header className="my-order-card-header">
        <div>
          <h2>Order {shortOrderId(order.id)}</h2>
          <p>Placed {formatShopDateTime(order.createdAt)}</p>
        </div>
        <div className="my-order-badges">
          <span className={`admin-status admin-status-${order.status.toLowerCase()}`}>{order.status}</span>
          {order.paymentStatus !== "Pay on pick-up" ? <PaymentStatusBadge status={order.paymentStatus} /> : null}
        </div>
      </header>

      <OrderTracker status={order.status} />
      {message ? <p className="my-order-message">{message}</p> : null}
      {needsProof ? <PaymentProofForm order={order} onUpdated={onUpdated} /> : null}

      <dl className="my-order-facts">
        <div>
          <dt>Pick-up</dt>
          <dd>{formatShopDateTime(order.pickupAt)}</dd>
        </div>
        <div>
          <dt>Items</dt>
          <dd>{order.itemCount}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatPhpCurrency(order.totalPhp)}</dd>
        </div>
      </dl>

      <button
        type="button"
        className="my-order-toggle"
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        onClick={() => setIsExpanded((current) => !current)}
      >
        {isExpanded ? "Hide details" : "View details"}
      </button>
      {isExpanded ? (
        <div id={detailsId}>
          <OrderDetails orderId={order.id} />
        </div>
      ) : null}
    </article>
  );
};

export const MyOrdersPage = () => {
  const { data: orders, error, isLoading, reload, updateData } = useApiData(fetchMyOrders, []);
  const handleUpdated = (updated: CustomerOrder) =>
    updateData((current) => current.map((order) => (order.id === updated.id ? updated : order)));

  return (
    <section className="cart-page my-orders-page">
      <div className="cart-page-header">
        <Link to="/" className="back-home-button">
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M10 3 5 8l5 5" />
          </svg>
          Back to Home
        </Link>
        <h1>My Orders</h1>
      </div>

      {!orders || isLoading ? (
        <LoadState error={error} onRetry={reload} />
      ) : orders.length > 0 ? (
        <div className="my-orders-list">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} onUpdated={handleUpdated} />
          ))}
        </div>
      ) : (
        <div className="catalog-empty-state cart-empty-state" role="status">
          <h2>No orders yet</h2>
          <p>Orders you place will show up here so you can follow them until pick-up.</p>
        </div>
      )}
    </section>
  );
};
