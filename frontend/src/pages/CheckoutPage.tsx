import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { CSSProperties } from "react";
import { errorMessage } from "../api/client";
import { placeOrder } from "../api/shop";
import type { Account, CartItem, PlacedOrder, SiteContent } from "../types/shop";
import { siteImage } from "../utils/assets";
import { formatPhpCurrency } from "../utils/currency";
import { formatShopDateTime, toDateTimeLocalValue } from "../utils/dates";

interface CheckoutPageProps {
  account: Account;
  items: CartItem[];
  siteContent: SiteContent | null;
  onOrderPlaced: () => void;
}

// Default pick-up: tomorrow at 2:00 PM. The API requires at least 1 hour and at most 60 days ahead.
const defaultPickupValue = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);
  return toDateTimeLocalValue(tomorrow);
};

const uniqueNames = (names: Array<string | undefined>) =>
  [...new Set(names.filter((name): name is string => Boolean(name)))].join(", ");

export const CheckoutPage = ({ account, items, siteContent, onOrderPlaced }: CheckoutPageProps) => {
  const navigate = useNavigate();
  const [orderItems] = useState<CartItem[]>(items);
  const [pickupValue, setPickupValue] = useState(defaultPickupValue);
  const [isConfirming, setIsConfirming] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const isConfirmed = placedOrder !== null;
  const wrapNames = uniqueNames(orderItems.map((item) => item.custom?.wrapName));
  const ribbonNames = uniqueNames(orderItems.map((item) => item.custom?.ribbonName));
  const minPickupValue = useMemo(() => toDateTimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)), []);
  const subtotal = orderItems.reduce((total, item) => total + item.quantity * item.pricePhp, 0);
  const primaryItem = orderItems[0];
  const flowerLines = useMemo(
    () => orderItems.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      total: item.quantity * item.pricePhp
    })),
    [orderItems]
  );

  const handleConfirm = async () => {
    if (isConfirming || isConfirmed || orderItems.length === 0) {
      return;
    }

    const pickupAt = new Date(pickupValue);
    if (Number.isNaN(pickupAt.getTime())) {
      setOrderError("Please choose a pick-up date and time.");
      return;
    }

    setIsConfirming(true);
    setOrderError(null);
    try {
      const order = await placeOrder({
        pickupAt: pickupAt.toISOString(),
        items: orderItems.map((item) => (
          item.custom
            ? { custom: item.custom.selection, quantity: item.quantity }
            : { productId: item.id, quantity: item.quantity }
        ))
      });
      setPlacedOrder(order);
      onOrderPlaced();
    } catch (error) {
      setOrderError(errorMessage(error));
    } finally {
      setIsConfirming(false);
    }
  };

  if (orderItems.length === 0) {
    return (
      <section
        className="checkout-page"
        style={{
          "--checkout-page-image": `url("${siteImage("background.jpg")}")`
        } as CSSProperties}
      >
        <div className="catalog-empty-state checkout-empty-state" role="status">
          <h2>No order to review</h2>
          <p>Add bouquets to your cart before checking out.</p>
          <Link to="/" className="checkout-button checkout-empty-button">
            Back to Home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className="checkout-page"
      aria-labelledby="checkout-title"
      style={{
        "--checkout-page-image": `url("${siteImage("background.jpg")}")`
      } as CSSProperties}
    >
      <header className="checkout-header">
        <h1 id="checkout-title">Order Summary</h1>
        <p>Review your bouquet before confirming</p>
      </header>

      <div className="order-summary-panel">
        <div className="order-summary-section">
          <h2>Your Bouquet</h2>
          <p className="order-base-price">
            Base price{primaryItem ? ` (${primaryItem.name})` : ""}: {formatPhpCurrency(primaryItem?.pricePhp ?? subtotal)}
          </p>
          <div className="order-line-list">
            {flowerLines.map((line) => (
              <div className="order-line" key={line.id}>
                <span className="order-quantity">{line.quantity}pc{line.quantity === 1 ? "" : "s"}</span>
                <span>{line.name}</span>
                <strong>{formatPhpCurrency(line.total)}</strong>
              </div>
            ))}
          </div>
        </div>

        {wrapNames ? (
          <div className="order-summary-section order-style-section">
            <h2>Wrapper</h2>
            <p>{wrapNames}</p>
          </div>
        ) : null}

        {ribbonNames ? (
          <div className="order-summary-section order-style-section">
            <h2>Ribbon</h2>
            <p>{ribbonNames}</p>
          </div>
        ) : null}

        <div className="order-total-section">
          <div>
            <span>Subtotal</span>
            <strong>{formatPhpCurrency(subtotal)}</strong>
          </div>
          <div className="order-grand-total">
            <span>Total</span>
            <strong>{formatPhpCurrency(subtotal)}</strong>
          </div>
        </div>

        <div className="pickup-details-section">
          <h2>Pick-up Details</h2>
          <ul>
            <li>
              <span aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              {account.fullName}
            </li>
            <li>
              <span aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.91.33 1.8.63 2.65a2 2 0 0 1-.45 2.11L8 9.77a16 16 0 0 0 6.23 6.23l1.29-1.29a2 2 0 0 1 2.11-.45c.85.3 1.74.51 2.65.63A2 2 0 0 1 22 16.92Z" />
                </svg>
              </span>
              {account.contactNumber}
            </li>
            <li>
              <span aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              {siteContent ? `${siteContent.pickupMethod} · ${siteContent.fullAddress}` : null}
            </li>
            <li>
              <span aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M8 2v4" />
                  <path d="M16 2v4" />
                  <rect width="18" height="18" x="3" y="4" rx="2" />
                  <path d="M3 10h18" />
                </svg>
              </span>
              {isConfirmed ? (
                formatShopDateTime(placedOrder.pickupAt)
              ) : (
                <input
                  type="datetime-local"
                  className="pickup-datetime-input"
                  value={pickupValue}
                  min={minPickupValue}
                  onChange={(event) => setPickupValue(event.target.value)}
                  aria-label="Pick-up date and time"
                  required
                />
              )}
            </li>
            <li>
              <span aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              </span>
              {siteContent?.paymentMethod}
            </li>
          </ul>
        </div>

        {placedOrder ? (
          <div className="order-success-message" role="status">
            Successful order. We will prepare your bouquet for pick-up. Total due on pick-up: {formatPhpCurrency(placedOrder.totalPhp)}
          </div>
        ) : null}

        {orderError ? (
          <div className="order-success-message order-error-message" role="alert">
            {orderError}
          </div>
        ) : null}

        <div className="order-summary-actions">
          <button
            type="button"
            className="order-cancel-button"
            onClick={() => navigate("/cart")}
            disabled={isConfirming || isConfirmed}
          >
            Cancel
          </button>
          <button
            type="button"
            className="order-confirm-button"
            onClick={handleConfirm}
            disabled={isConfirming || isConfirmed}
          >
            {isConfirming ? "Confirming..." : isConfirmed ? "Confirmed" : "Confirm Order"}
          </button>
        </div>
      </div>
    </section>
  );
};
