import { useState } from "react";
import { Link } from "react-router";
import { fetchMyOrder, fetchMyOrders } from "../api/shop";
import { LoadState } from "../components/LoadState";
import { useApiData } from "../hooks/useApiData";
import type { AdminOrderStatus, CustomerOrder } from "../types/shop";
import { formatPhpCurrency } from "../utils/currency";
import { formatShopDateTime } from "../utils/dates";

const TRACK_STEPS: Array<{ status: AdminOrderStatus; label: string; message: string }> = [
  { status: "Pending", label: "Order placed", message: "We received your order and are preparing your bouquet." },
  { status: "Ready", label: "Ready for pick-up", message: "Your bouquet is ready. Pay on pick-up at the shop." },
  { status: "Completed", label: "Picked up", message: "Order complete. Thank you for choosing us!" }
];

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
      {order.items.map((item) => (
        <li key={item.id} className="my-order-item">
          {item.image ? <img src={item.image} alt="" /> : <span className="my-order-item-placeholder" aria-hidden="true">✿</span>}
          <div>
            <h3>{item.customization ? `Custom ${item.customization.size} Bouquet` : item.name}</h3>
            {item.customization ? (
              <p>
                {item.customization.palette} · {item.customization.wrap} · {item.customization.ribbon}
              </p>
            ) : null}
            {item.flowers.length > 0 ? (
              <p>{item.flowers.map((flower) => `${flower.name} ×${flower.quantity}`).join(", ")}</p>
            ) : null}
          </div>
          <span className="my-order-item-qty">×{item.quantity}</span>
          <strong>{formatPhpCurrency(item.unitPricePhp * item.quantity)}</strong>
        </li>
      ))}
    </ul>
  );
};

const OrderCard = ({ order }: { order: CustomerOrder }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const step = TRACK_STEPS.find((entry) => entry.status === order.status);
  const detailsId = `order-details-${order.id}`;

  return (
    <article className="my-order-card">
      <header className="my-order-card-header">
        <div>
          <h2>Order {shortOrderId(order.id)}</h2>
          <p>Placed {formatShopDateTime(order.createdAt)}</p>
        </div>
        <span className={`admin-status admin-status-${order.status.toLowerCase()}`}>{order.status}</span>
      </header>

      <OrderTracker status={order.status} />
      {step ? <p className="my-order-message">{step.message}</p> : null}

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
  const { data: orders, error, isLoading, reload } = useApiData(fetchMyOrders, []);

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
            <OrderCard key={order.id} order={order} />
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
