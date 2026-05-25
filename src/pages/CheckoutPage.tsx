import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CartItem, MockAccount } from "../types/shop";
import { formatPhpCurrency } from "../utils/currency";

interface CheckoutPageProps {
  account: MockAccount;
  items: CartItem[];
  onConfirmOrder: () => void;
}

const pickupWindow = "May 26, 2026 - 2:00 PM - 4:00 PM";

export const CheckoutPage = ({ account, items, onConfirmOrder }: CheckoutPageProps) => {
  const navigate = useNavigate();
  const [orderItems] = useState<CartItem[]>(items);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
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

  const handleConfirm = () => {
    if (isConfirming || isConfirmed || orderItems.length === 0) {
      return;
    }

    setIsConfirming(true);
    window.setTimeout(() => {
      onConfirmOrder();
      setIsConfirming(false);
      setIsConfirmed(true);
    }, 900);
  };

  if (orderItems.length === 0) {
    return (
      <section className="checkout-page">
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
    <section className="checkout-page" aria-labelledby="checkout-title">
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

        <div className="order-summary-section order-style-section">
          <h2>Wrapper</h2>
          <p>Kraft Paper</p>
        </div>

        <div className="order-summary-section order-style-section">
          <h2>Ribbon</h2>
          <p>Satin Ribbon</p>
        </div>

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
              In-store pick-up
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
              {pickupWindow}
            </li>
            <li>
              <span aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              </span>
              Cash on Pick-up
            </li>
          </ul>
        </div>

        {isConfirmed ? (
          <div className="order-success-message" role="status">
            Successful order. We will prepare your bouquet for pick-up.
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
