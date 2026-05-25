import { useState, type CSSProperties, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { ProductItem } from "../types/shop";
import { formatPhpCurrency } from "../utils/currency";

interface ProductCardProps {
  product: ProductItem;
  onAddToCart: (product: ProductItem, quantity: number) => boolean;
}

export const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const [qty, setQty] = useState(0);
  const [flyAnimation, setFlyAnimation] = useState<{
    id: number;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  } | null>(null);
  const quantityLabel = `Quantity for ${product.name}`;
  const decreaseLabel = `Decrease ${product.name}`;
  const increaseLabel = `Increase ${product.name}`;

  const handleAddToCart = (event: MouseEvent<HTMLButtonElement>) => {
    if (!onAddToCart(product, qty)) {
      return;
    }

    const sourceRect = event.currentTarget.closest(".product-card")?.querySelector("img")?.getBoundingClientRect()
      ?? event.currentTarget.getBoundingClientRect();
    const cartRect = document.querySelector(".cart-link")?.getBoundingClientRect();

    if (cartRect) {
      setFlyAnimation({
        id: Date.now(),
        fromX: sourceRect.left + sourceRect.width / 2,
        fromY: sourceRect.top + sourceRect.height / 2,
        toX: cartRect.left + cartRect.width / 2,
        toY: cartRect.top + cartRect.height / 2
      });
      window.setTimeout(() => setFlyAnimation(null), 820);
    }

    setQty(0);
  };

  return (
    <article className="product-card">
      <img src={product.image} alt={product.name} />
      <div className="product-card-body">
        <h3>{product.name}</h3>
        <p className="product-price">{formatPhpCurrency(product.pricePhp)} PHP</p>
      </div>
      <div className="qty" aria-label={quantityLabel}>
        <button type="button" onClick={() => setQty((prev) => Math.max(prev - 1, 0))} aria-label={decreaseLabel}>-</button>
        <span>{qty}</span>
        <button type="button" onClick={() => setQty((prev) => prev + 1)} aria-label={increaseLabel}>+</button>
      </div>
      <button
        type="button"
        className="add-to-cart-btn"
        disabled={qty === 0}
        onClick={handleAddToCart}
      >
        Add to Cart
      </button>
      {flyAnimation
        ? createPortal(
            <span
              key={flyAnimation.id}
              className="cart-fly-item"
              style={{
                "--from-x": `${flyAnimation.fromX}px`,
                "--from-y": `${flyAnimation.fromY}px`,
                "--to-x": `${flyAnimation.toX - flyAnimation.fromX}px`,
                "--to-y": `${flyAnimation.toY - flyAnimation.fromY}px`
              } as CSSProperties}
              aria-hidden="true"
            />,
            document.body
          )
        : null}
    </article>
  );
};
