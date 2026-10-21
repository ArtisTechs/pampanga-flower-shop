import { useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router";
import { fetchBuilder } from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { LoadState } from "../components/LoadState";
import { useApiData } from "../hooks/useApiData";
import type { BuilderConfig, BuilderOption, BuilderPreview, ProductItem } from "../types/shop";
import { formatPhpCurrency } from "../utils/currency";

type CustomizeStep = "flowers" | "style" | "preview";

interface CustomizeOrderPageProps {
  onAddToCart: (product: ProductItem, quantity: number) => boolean;
  onToast: (message: string, tone: ToastTone) => void;
}

// Starting choice from the API (admin default); falls back to the first available option.
const defaultChoice = (options: BuilderOption[], defaultId: string) =>
  options.find((option) => option.id === defaultId)?.id ?? options[0].id;

const findOption = (options: BuilderOption[], id: string) =>
  options.find((option) => option.id === id) ?? options[0];

const choiceFrom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

export const CustomizeOrderPage = ({ onAddToCart, onToast }: CustomizeOrderPageProps) => {
  const builder = useApiData(fetchBuilder, []);
  const config = builder.data;
  const isConfigUsable = config !== null
    && [config.sizes, config.flowers, config.palettes, config.wraps, config.ribbons].every((options) => options.length > 0);

  if (!isConfigUsable) {
    return (
      <section className="customize-order-page" aria-label="Customize">
        <div className="customize-order-shell">
          <LoadState
            error={config ? "The bouquet builder is not available right now." : builder.error}
            onRetry={builder.reload}
          />
        </div>
      </section>
    );
  }

  return <CustomizeOrderForm config={config} onAddToCart={onAddToCart} onToast={onToast} />;
};

interface CustomizeOrderFormProps extends CustomizeOrderPageProps {
  config: BuilderConfig;
}

const CustomizeOrderForm = ({ config, onAddToCart, onToast }: CustomizeOrderFormProps) => {
  const { sizes: bouquetSizes, flowers, palettes, wraps, ribbons, maxFlowers: maxFlowerCount, defaults: preferredDefaults } = config;
  const previewOptionsByFlowerCount = useMemo(() => {
    const byCount = new Map<number, BuilderPreview[]>();
    config.previews.forEach((preview) => {
      byCount.set(preview.flowerCount, [...(byCount.get(preview.flowerCount) ?? []), preview]);
    });
    return byCount;
  }, [config.previews]);
  const navigate = useNavigate();
  const [step, setStep] = useState<CustomizeStep>("flowers");
  const [selectedSize, setSelectedSize] = useState(() => defaultChoice(bouquetSizes, preferredDefaults.size));
  const [flowerCounts, setFlowerCounts] = useState<Record<string, number>>(
    Object.fromEntries(flowers.map((flower) => [flower.id, 0]))
  );
  const [selectedPalette, setSelectedPalette] = useState(() => defaultChoice(palettes, preferredDefaults.palette));
  const [selectedWrap, setSelectedWrap] = useState(() => defaultChoice(wraps, preferredDefaults.wrap));
  const [selectedRibbon, setSelectedRibbon] = useState(() => defaultChoice(ribbons, preferredDefaults.ribbon));
  const [showAddedPrompt, setShowAddedPrompt] = useState(false);
  const [flyAnimation, setFlyAnimation] = useState<{
    id: number;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  } | null>(null);

  const selectedSizeOption = findOption(bouquetSizes, selectedSize);
  const selectedPaletteOption = findOption(palettes, selectedPalette);
  const selectedWrapOption = findOption(wraps, selectedWrap);
  const selectedRibbonOption = findOption(ribbons, selectedRibbon);
  const selectedFlowers = flowers.filter((flower) => flowerCounts[flower.id] > 0);
  const totalFlowerCount = selectedFlowers.reduce((total, flower) => total + flowerCounts[flower.id], 0);
  const totalPrice = useMemo(
    () => selectedSizeOption.pricePhp
      + selectedFlowers.reduce((total, flower) => total + flower.pricePhp * flowerCounts[flower.id], 0),
    [flowerCounts, selectedFlowers, selectedSizeOption.pricePhp]
  );
  const previewImage = useMemo(() => {
    const countKey = Math.max(1, Math.min(maxFlowerCount, totalFlowerCount));
    const options = previewOptionsByFlowerCount.get(countKey) ?? config.previews;

    if (options.length === 0) {
      return "";
    }

    const selectedFlowerIds = selectedFlowers.map((flower) => flower.id);
    const dominantFlower = selectedFlowers.reduce<{ id: string; count: number } | null>((dominant, flower) => {
      const count = flowerCounts[flower.id];
      return !dominant || count > dominant.count ? { id: flower.id, count } : dominant;
    }, null);

    return options
      .map((option) => {
        const flowerScore = selectedFlowerIds.reduce(
          (score, flowerId) => score + (option.flowers.includes(flowerId) ? 14 : 0),
          0
        );

        return {
          option,
          score:
            flowerScore
            + (dominantFlower && option.flowers.includes(dominantFlower.id) ? 24 : 0)
            + (option.palettes.includes(selectedPalette) ? 18 : 0)
            + (option.wraps.includes(selectedWrap) ? 12 : 0)
            + (option.ribbons.includes(selectedRibbon) ? 8 : 0)
        };
      })
      .sort((first, second) => second.score - first.score)[0].option.image;
  }, [config.previews, flowerCounts, maxFlowerCount, previewOptionsByFlowerCount, selectedFlowers, selectedPalette, selectedRibbon, selectedWrap, totalFlowerCount]);

  const updateFlowerCount = (flowerId: string, amount: number) => {
    setFlowerCounts((currentCounts) => {
      const currentTotal = Object.values(currentCounts).reduce((total, count) => total + count, 0);

      if (amount > 0 && currentTotal >= maxFlowerCount) {
        return currentCounts;
      }

      return {
        ...currentCounts,
        [flowerId]: Math.max(0, currentCounts[flowerId] + amount)
      };
    });
  };

  const handleSurpriseMe = () => {
    const nextCounts = Object.fromEntries(flowers.map((flower) => [flower.id, 0]));
    const shuffledFlowers = [...flowers].sort(() => Math.random() - 0.5).slice(0, 3);

    shuffledFlowers.forEach((flower) => {
      const currentTotal = Object.values(nextCounts).reduce((total, count) => total + count, 0);
      const remainingSlots = maxFlowerCount - currentTotal;

      if (remainingSlots > 0) {
        nextCounts[flower.id] = Math.min(Math.floor(Math.random() * 3) + 1, remainingSlots);
      }
    });

    setSelectedSize(choiceFrom(bouquetSizes).id);
    setFlowerCounts(nextCounts);
    setSelectedPalette(choiceFrom(palettes).id);
    setSelectedWrap(choiceFrom(wraps).id);
    setSelectedRibbon(choiceFrom(ribbons).id);
    setStep("flowers");
  };

  const handleNextStep = () => {
    if (totalFlowerCount === 0) {
      onToast("Choose at least one flower before proceeding.", "error");
      return;
    }

    setStep("style");
  };

  const resetCustomization = () => {
    setSelectedSize(defaultChoice(bouquetSizes, preferredDefaults.size));
    setFlowerCounts(Object.fromEntries(flowers.map((flower) => [flower.id, 0])));
    setSelectedPalette(defaultChoice(palettes, preferredDefaults.palette));
    setSelectedWrap(defaultChoice(wraps, preferredDefaults.wrap));
    setSelectedRibbon(defaultChoice(ribbons, preferredDefaults.ribbon));
    setStep("flowers");
    setShowAddedPrompt(false);
  };

  const handleProceed = () => {
    if (step === "flowers") {
      handleNextStep();
      return;
    }

    setStep("preview");
  };

  const handleAddCustomBouquet = (event: MouseEvent<HTMLButtonElement>) => {
    const flowerSummary = selectedFlowers
      .map((flower) => `${flower.name} x${flowerCounts[flower.id]}`)
      .join(", ");
    const product: ProductItem = {
      id: `custom-${Date.now()}`,
      name: `Custom ${selectedSizeOption.name} Bouquet - ${selectedPaletteOption.name}, ${selectedWrapOption.name}, ${selectedRibbonOption.name} (${flowerSummary})`,
      pricePhp: totalPrice,
      image: previewImage,
      custom: {
        selection: {
          size: selectedSizeOption.id,
          palette: selectedPaletteOption.id,
          wrap: selectedWrapOption.id,
          ribbon: selectedRibbonOption.id,
          flowers: selectedFlowers.map((flower) => ({ code: flower.id, quantity: flowerCounts[flower.id] }))
        },
        wrapName: selectedWrapOption.name,
        ribbonName: selectedRibbonOption.name
      }
    };

    if (onAddToCart(product, 1)) {
      const sourceRect = event.currentTarget.closest(".custom-preview-card")?.querySelector("img")?.getBoundingClientRect()
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

      onToast("Custom bouquet added to cart.", "success");
      setShowAddedPrompt(true);
    }
  };

  return (
    <section className="customize-order-page" aria-labelledby="customize-order-title">
      <div className="customize-order-shell">
        {step !== "preview" ? (
        <div className="customize-actions customize-actions-top">
          {step === "flowers" ? (
            <Link to="/" className="back-home-button">
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M10 3 5 8l5 5" />
              </svg>
              Back
            </Link>
          ) : (
            <button type="button" className="back-home-button" onClick={() => setStep("flowers")}>
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M10 3 5 8l5 5" />
              </svg>
              Back
            </button>
          )}
          <button
            type="button"
            className="proceed-button"
            onClick={handleProceed}
          >
            {step === "flowers" ? "Proceed" : "Preview"}
          </button>
        </div>
        ) : null}

        <header className="customize-order-header">
          <div>
            <h1 id="customize-order-title">Customize</h1>
            <p>Make it uniquely yours</p>
          </div>
          <strong>{formatPhpCurrency(totalPrice)} PHP</strong>
        </header>

        <div className="customize-order-divider" />

        {step !== "preview" ? (
          <>
            <button type="button" className="surprise-button" onClick={handleSurpriseMe}>
              Surprise Me
            </button>

            <div className="customize-order-divider" />
          </>
        ) : null}

        {step === "flowers" ? (
          <>
            <div className="customize-section">
              <h2>Bouquet Size</h2>
              <div className="bouquet-size-grid">
                {bouquetSizes.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    className={`custom-choice size-choice ${selectedSize === size.id ? "selected" : ""}`}
                    onClick={() => setSelectedSize(size.id)}
                    aria-pressed={selectedSize === size.id}
                  >
                    <span>{size.name}</span>
                    <strong>{formatPhpCurrency(size.pricePhp)} PHP</strong>
                  </button>
                ))}
              </div>
            </div>

            <div className="customize-section">
              <div className="customize-section-heading">
                <h2>Flower Selection</h2>
                <span>{totalFlowerCount}/{maxFlowerCount} flowers selected</span>
              </div>
              <div className="flower-choice-grid">
                {flowers.map((flower) => (
                  <article key={flower.id} className={`flower-choice ${flowerCounts[flower.id] > 0 ? "selected" : ""}`}>
                    <span className="flower-dot" style={{ backgroundColor: flower.colors[0] }} aria-hidden="true" />
                    <div>
                      <strong>{flower.name}</strong>
                      <span>+{flower.pricePhp} PHP per pc</span>
                    </div>
                    <div className="flower-stepper" aria-label={`${flower.name} quantity`}>
                      <button type="button" onClick={() => updateFlowerCount(flower.id, -1)} aria-label={`Remove ${flower.name}`}>
                        -
                      </button>
                      <span>{flowerCounts[flower.id]}</span>
                      <button
                        type="button"
                        onClick={() => updateFlowerCount(flower.id, 1)}
                        aria-label={`Add ${flower.name}`}
                        disabled={totalFlowerCount >= maxFlowerCount}
                      >
                        +
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </>
        ) : step === "style" ? (
          <>
            <div className="customize-section">
              <h2>Color Palette</h2>
              <div className="palette-grid">
                {palettes.map((palette) => (
                  <button
                    key={palette.id}
                    type="button"
                    className={`palette-choice ${selectedPalette === palette.id ? "selected" : ""}`}
                    onClick={() => setSelectedPalette(palette.id)}
                    aria-pressed={selectedPalette === palette.id}
                  >
                    <span className="palette-swatches" aria-hidden="true">
                      {palette.colors.map((color) => (
                        <span key={color} style={{ backgroundColor: color }} />
                      ))}
                    </span>
                    <strong>{palette.name}</strong>
                  </button>
                ))}
              </div>
            </div>

            <div className="customize-section">
              <h2>Wrap Style</h2>
              <div className="pill-choice-grid four-column">
                {wraps.map((wrap) => (
                  <button
                    key={wrap.id}
                    type="button"
                    className={`custom-choice ${selectedWrap === wrap.id ? "selected" : ""}`}
                    onClick={() => setSelectedWrap(wrap.id)}
                    aria-pressed={selectedWrap === wrap.id}
                  >
                    {wrap.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="customize-section">
              <h2>Ribbon Style</h2>
              <div className="pill-choice-grid">
                {ribbons.map((ribbon) => (
                  <button
                    key={ribbon.id}
                    type="button"
                    className={`custom-choice ${selectedRibbon === ribbon.id ? "selected" : ""}`}
                    onClick={() => setSelectedRibbon(ribbon.id)}
                    aria-pressed={selectedRibbon === ribbon.id}
                  >
                    {ribbon.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="custom-preview-stage" aria-label="Custom bouquet preview">
            <p className="custom-preview-eyebrow">Your custom creation</p>
            <h2>Build Your Bouquet</h2>
            <div className="custom-preview-card">
              <div className="custom-preview-image-wrap">
                <img src={previewImage} alt="Preview of your customized bouquet" />
              </div>
              <div className="custom-preview-summary">
                <span>{selectedSizeOption.name}</span>
                <span>{selectedPaletteOption.name}</span>
                <span>{selectedWrapOption.name}</span>
                <span>{selectedRibbonOption.name}</span>
                <strong>{formatPhpCurrency(totalPrice)} PHP</strong>
              </div>
              <div className="custom-preview-actions">
                <button type="button" className="custom-preview-cancel" onClick={() => setStep("style")}>
                  Back
                </button>
                <button type="button" className="proceed-button" onClick={handleAddCustomBouquet}>
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddedPrompt ? (
        <div className="custom-added-overlay" role="dialog" aria-modal="true" aria-labelledby="custom-added-title">
          <div className="custom-added-dialog">
            <img src={previewImage} alt="" aria-hidden="true" />
            <h2 id="custom-added-title">Bouquet added to cart</h2>
            <p>Would you like to create another customized bouquet or return home?</p>
            <div className="custom-added-actions">
              <button type="button" className="proceed-button" onClick={resetCustomization}>
                Customize Another
              </button>
              <button type="button" className="back-home-button" onClick={() => navigate("/")}>
                Return Home
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {flyAnimation
        ? createPortal(
            <span
              key={flyAnimation.id}
              className="cart-fly-item"
              style={{
                "--from-x": `${flyAnimation.fromX}px`,
                "--from-y": `${flyAnimation.fromY}px`,
                "--to-x": `${flyAnimation.toX - flyAnimation.fromX}px`,
                "--to-y": `${flyAnimation.toY - flyAnimation.fromY}px`,
                backgroundImage: `url(${previewImage})`
              } as CSSProperties}
              aria-hidden="true"
            />,
            document.body
          )
        : null}
    </section>
  );
};
