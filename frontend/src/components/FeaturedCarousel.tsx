import { useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { Link } from "react-router";
import type { ProductItem } from "../types/shop";
import { formatPhpCurrency } from "../utils/currency";
import { isSoldOut, stockLabel } from "../utils/stock";

interface FeaturedCarouselProps {
  products: ProductItem[];
  route: string;
  label: string;
  intervalMs?: number;
}

const SWIPE_THRESHOLD = 48;

// Signed distance from the active slide, wrapped so the carousel loops in both directions.
const slideOffset = (index: number, active: number, count: number) => {
  let offset = index - active;
  if (offset > count / 2) offset -= count;
  if (offset < -count / 2) offset += count;
  return offset;
};

// Coverflow carousel. Autoplay is driven by the active dot's progress animation, so pausing it
// (hover, focus, reduced motion) pauses the timer too.
export const FeaturedCarousel = ({ products, route, label, intervalMs = 5200 }: FeaturedCarouselProps) => {
  const [active, setActive] = useState(0);
  const dragStart = useRef<number | null>(null);
  const didDrag = useRef(false);
  const count = products.length;

  if (count === 0) {
    return null;
  }

  const goTo = (index: number) => setActive(((index % count) + count) % count);
  const next = () => goTo(active + 1);
  const prev = () => goTo(active - 1);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      prev();
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = event.clientX;
    didDrag.current = false;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) {
      return;
    }
    const delta = event.clientX - dragStart.current;
    dragStart.current = null;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      didDrag.current = true;
      if (delta < 0) {
        next();
      } else {
        prev();
      }
    }
  };

  const handleSlideClick = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
    // A swipe or a click on a side slide moves the carousel instead of navigating.
    if (didDrag.current || index !== active) {
      event.preventDefault();
      if (!didDrag.current) {
        goTo(index);
      }
    }
    didDrag.current = false;
  };

  return (
    <div
      className="featured-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      <div
        className="featured-track"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { dragStart.current = null; }}
      >
        {products.map((product, index) => {
          const offset = slideOffset(index, active, count);
          const isActive = offset === 0;
          return (
            <Link
              key={product.id}
              to={route}
              className={`featured-slide${isActive ? " is-active" : ""}`}
              style={{ "--offset": offset, "--abs-offset": Math.abs(offset) } as CSSProperties}
              data-hidden={Math.abs(offset) > 2 || undefined}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}: ${product.name}`}
              aria-hidden={!isActive}
              tabIndex={isActive ? 0 : -1}
              draggable={false}
              onClick={(event) => handleSlideClick(event, index)}
            >
              <div className="featured-media">
                <img src={product.image} alt="" draggable={false} loading={Math.abs(offset) <= 1 ? "eager" : "lazy"} />
              </div>
              <div className="featured-caption">
                <span className="featured-badge">Best Seller</span>
                <h3>{product.name}</h3>
                <p className="featured-price">{formatPhpCurrency(product.pricePhp)}</p>
                {stockLabel(product.stock, "bouquets") ? (
                  <p className={`stock-note ${isSoldOut(product.stock) ? "sold-out" : ""}`}>{stockLabel(product.stock, "bouquets")}</p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="featured-controls">
        <button type="button" className="featured-arrow" onClick={prev} aria-label="Previous bouquet">
          <span aria-hidden="true">←</span>
        </button>
        <div className="featured-dots">
          {products.map((product, index) => (
            <button
              key={product.id}
              type="button"
              className={`featured-dot${index === active ? " is-active" : ""}`}
              onClick={() => goTo(index)}
              aria-label={`Show ${product.name}`}
              aria-current={index === active || undefined}
            >
              {index === active ? (
                <span
                  key={active}
                  className="featured-dot-progress"
                  style={{ animationDuration: `${intervalMs}ms` }}
                  onAnimationEnd={next}
                />
              ) : null}
            </button>
          ))}
        </div>
        <button type="button" className="featured-arrow" onClick={next} aria-label="Next bouquet">
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
};
