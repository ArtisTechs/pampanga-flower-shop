import { Link } from "react-router";
import { MAX_ITEM_QUANTITY } from "../hooks/useCart";
import type { CartItem } from "../types/shop";
import { formatPhpCurrency } from "../utils/currency";

interface CartPageProps {
  items: CartItem[];
  onRemoveItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
}

export const CartPage = ({ items, onRemoveItem, onUpdateQuantity }: CartPageProps) => {
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce((total, item) => total + item.quantity * item.pricePhp, 0);

  return (
    <section className="cart-page">
      <div className="cart-page-header">
        <Link to="/" className="back-home-button">
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M10 3 5 8l5 5" />
          </svg>
          Back to Home
        </Link>
        <h1>Your Cart</h1>
      </div>

      {items.length > 0 ? (
        <>
          <div className="cart-list">
            {items.map((item) => (
              <article key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} />
                <div>
                  <h2>{item.name}</h2>
                  <p>{formatPhpCurrency(item.pricePhp)}</p>
                </div>
                <div className="cart-item-quantity">
                  <span>Qty</span>
                  <div className="cart-qty-stepper" aria-label={`Quantity for ${item.name}`}>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label={`Decrease ${item.name}`}
                    >
                      -
                    </button>
                    <strong>{item.quantity}</strong>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= MAX_ITEM_QUANTITY}
                      aria-label={`Increase ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
                <strong className="cart-item-total">{formatPhpCurrency(item.pricePhp * item.quantity)}</strong>
                <button
                  type="button"
                  className="cart-remove-btn"
                  onClick={() => onRemoveItem(item.id)}
                  aria-label={`Remove ${item.name} from cart`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M4 7h16" />
                    <path d="M9 7V4h6v3" />
                    <path d="M7 7l1 13h8l1-13" />
                    <path d="M10 11v5" />
                    <path d="M14 11v5" />
                  </svg>
                </button>
              </article>
            ))}
          </div>
          <div className="cart-summary">
            <div>
              <span>{totalItems} item{totalItems === 1 ? "" : "s"}</span>
              <strong>{formatPhpCurrency(totalPrice)}</strong>
            </div>
            <Link to="/checkout" className="checkout-button">
              Checkout
            </Link>
          </div>
        </>
      ) : (
        <div className="catalog-empty-state cart-empty-state" role="status">
          <h2>Your cart is empty</h2>
          <p>Add bouquets from any catalog page to see them here.</p>
        </div>
      )}
    </section>
  );
};
