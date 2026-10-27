import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router";
import { fetchBouquetPreview, fetchBuilder } from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { CustomBouquetDetails } from "../components/CustomBouquetDetails";
import { LoadingBloom, LoadState } from "../components/LoadState";
import { useApiData } from "../hooks/useApiData";
import type {
  BouquetSelection,
  BuilderConfig,
  BuilderOption,
  BuilderPreview,
  CustomBouquetSummary,
  ProductItem
} from "../types/shop";
import { resolveImagePath } from "../utils/assets";
import { formatPhpCurrency } from "../utils/currency";
import { isSoldOut, stockLabel, stockLimit } from "../utils/stock";

type CustomizeStep = "flowers" | "style" | "preview";

interface GeneratedPreviewState {
  signature: string;
  status: "loading" | "ready" | "failed";
  image: string | null;
}

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

// Every flower starts in its admin-set default color.
const defaultFlowerColors = (flowers: BuilderOption[]) =>
  Object.fromEntries(
    flowers.map((flower) => [flower.id, (flower.colorChoices.find((color) => color.isDefault) ?? flower.colorChoices[0])?.name ?? ""])
  );

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
  const { sizes: bouquetSizes, flowers, fillers, palettes, wraps, ribbons, maxFlowers: maxFlowerCount, defaults: preferredDefaults } = config;
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
  const [flowerColors, setFlowerColors] = useState<Record<string, string>>(() => defaultFlowerColors(flowers));
  const [selectedFillers, setSelectedFillers] = useState<string[]>([]);
  const [selectedPalette, setSelectedPalette] = useState(() => defaultChoice(palettes, preferredDefaults.palette));
  const [selectedWrap, setSelectedWrap] = useState(() => defaultChoice(wraps, preferredDefaults.wrap));
  const [selectedRibbon, setSelectedRibbon] = useState(() => defaultChoice(ribbons, preferredDefaults.ribbon));
  const [showAddedPrompt, setShowAddedPrompt] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<GeneratedPreviewState | null>(null);
  // Images already returned this visit, so going back and forth doesn't call the API again.
  const previewCache = useRef(new Map<string, string>());
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
  const selectedFillerOptions = fillers.filter((filler) => selectedFillers.includes(filler.id));
  const totalFlowerCount = selectedFlowers.reduce((total, flower) => total + flowerCounts[flower.id], 0);
  const flowerColorOf = (flower: BuilderOption) =>
    flower.colorChoices.find((color) => color.name === flowerColors[flower.id]) ?? null;
  const totalPrice = useMemo(
    () => selectedSizeOption.pricePhp + selectedPaletteOption.pricePhp + selectedWrapOption.pricePhp + selectedRibbonOption.pricePhp
      + selectedFlowers.reduce((total, flower) => total + flower.pricePhp * flowerCounts[flower.id], 0)
      + selectedFillerOptions.reduce((total, filler) => total + filler.pricePhp, 0),
    [
      flowerCounts, selectedFillerOptions, selectedFlowers, selectedPaletteOption.pricePhp, selectedRibbonOption.pricePhp,
      selectedSizeOption.pricePhp, selectedWrapOption.pricePhp
    ]
  );
  const selection: BouquetSelection = {
    size: selectedSizeOption.id,
    palette: selectedPaletteOption.id,
    wrap: selectedWrapOption.id,
    ribbon: selectedRibbonOption.id,
    flowers: selectedFlowers.map((flower) => ({
      code: flower.id,
      quantity: flowerCounts[flower.id],
      ...(flowerColorOf(flower) ? { color: flowerColors[flower.id] } : {})
    })),
    fillers: selectedFillerOptions.map((filler) => filler.id)
  };
  const bouquetSummary: CustomBouquetSummary = {
    size: selectedSizeOption.name,
    palette: selectedPaletteOption.name,
    wrap: selectedWrapOption.name,
    ribbon: selectedRibbonOption.name,
    flowers: selectedFlowers.map((flower) => ({
      name: flower.name,
      quantity: flowerCounts[flower.id],
      color: flowerColorOf(flower)?.name ?? null
    })),
    fillers: selectedFillerOptions.map((filler) => filler.name)
  };
  const selectionSignature = JSON.stringify(selection);
  // Closest stock photo: shown if the exact preview can't be generated.
  const stockPreviewImage = useMemo(() => {
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

  // The exact preview is requested on the preview step only; the API reuses a cached image when it has one
  // and generates a new one otherwise.
  useEffect(() => {
    if (step !== "preview") {
      return;
    }
    const cachedImage = previewCache.current.get(selectionSignature);
    if (cachedImage) {
      setGeneratedPreview({ signature: selectionSignature, status: "ready", image: cachedImage });
      return;
    }

    let isCurrent = true;
    setGeneratedPreview({ signature: selectionSignature, status: "loading", image: null });
    fetchBouquetPreview(JSON.parse(selectionSignature) as BouquetSelection)
      .then((image) => {
        previewCache.current.set(selectionSignature, image);
        if (isCurrent) {
          setGeneratedPreview({ signature: selectionSignature, status: "ready", image });
        }
      })
      .catch(() => {
        if (isCurrent) {
          setGeneratedPreview({ signature: selectionSignature, status: "failed", image: null });
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [selectionSignature, step]);

  const currentPreview = generatedPreview?.signature === selectionSignature ? generatedPreview : null;
  const isPreviewLoading = step === "preview" && (!currentPreview || currentPreview.status === "loading");
  const previewImage = currentPreview?.image ?? stockPreviewImage;

  const stemsLeft = (flowerId: string) => stockLimit(flowers.find((flower) => flower.id === flowerId)?.stock);

  const updateFlowerCount = (flowerId: string, amount: number) => {
    setFlowerCounts((currentCounts) => {
      const currentTotal = Object.values(currentCounts).reduce((total, count) => total + count, 0);

      if (amount > 0 && (currentTotal >= maxFlowerCount || currentCounts[flowerId] >= stemsLeft(flowerId))) {
        return currentCounts;
      }

      return {
        ...currentCounts,
        [flowerId]: Math.max(0, currentCounts[flowerId] + amount)
      };
    });
  };

  const toggleFiller = (fillerId: string) => {
    setSelectedFillers((current) =>
      current.includes(fillerId)
        ? current.filter((id) => id !== fillerId)
        : isSoldOut(fillers.find((filler) => filler.id === fillerId)?.stock) ? current : [...current, fillerId]
    );
  };

  const handleSurpriseMe = () => {
    const nextCounts = Object.fromEntries(flowers.map((flower) => [flower.id, 0]));
    const shuffledFlowers = flowers.filter((flower) => !isSoldOut(flower.stock)).sort(() => Math.random() - 0.5).slice(0, 3);

    shuffledFlowers.forEach((flower) => {
      const currentTotal = Object.values(nextCounts).reduce((total, count) => total + count, 0);
      const remainingSlots = maxFlowerCount - currentTotal;

      if (remainingSlots > 0) {
        nextCounts[flower.id] = Math.min(Math.floor(Math.random() * 3) + 1, remainingSlots, stockLimit(flower.stock));
      }
    });

    setSelectedSize(choiceFrom(bouquetSizes).id);
    setFlowerCounts(nextCounts);
    setFlowerColors(Object.fromEntries(
      flowers.map((flower) => [flower.id, flower.colorChoices.length > 0 ? choiceFrom(flower.colorChoices).name : ""])
    ));
    setSelectedFillers(
      fillers.filter((filler) => !isSoldOut(filler.stock)).sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 3)).map((filler) => filler.id)
    );
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
    setFlowerColors(defaultFlowerColors(flowers));
    setSelectedFillers([]);
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
      .map((flower) => `${flowerColorOf(flower) ? `${flowerColors[flower.id]} ` : ""}${flower.name} x${flowerCounts[flower.id]}`)
      .join(", ");
    const fillerSummary = selectedFillerOptions.length > 0
      ? ` with ${selectedFillerOptions.map((filler) => filler.name).join(", ")}`
      : "";
    const product: ProductItem = {
      id: `custom-${Date.now()}`,
      name: `Custom ${selectedSizeOption.name} Bouquet - ${selectedPaletteOption.name}, ${selectedWrapOption.name}, ${selectedRibbonOption.name} (${flowerSummary}${fillerSummary})`,
      pricePhp: totalPrice,
      image: previewImage,
      custom: {
        selection,
        wrapName: selectedWrapOption.name,
        ribbonName: selectedRibbonOption.name,
        summary: bouquetSummary
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
          <strong>{formatPhpCurrency(totalPrice)}</strong>
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
                    <strong>{formatPhpCurrency(size.pricePhp)}</strong>
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
                {flowers.map((flower) => {
                  const soldOut = isSoldOut(flower.stock);
                  const stockText = stockLabel(flower.stock, flower.stockUnit ?? "stems");
                  return (
                  <article
                    key={flower.id}
                    className={`flower-choice ${flowerCounts[flower.id] > 0 ? "selected" : ""} ${soldOut ? "sold-out" : ""}`}
                  >
                    <span
                      className="flower-dot"
                      style={{ backgroundColor: flowerColorOf(flower)?.hex ?? flower.colors[0] }}
                      aria-hidden="true"
                    />
                    <div>
                      <strong>{flower.name}</strong>
                      <span>+{formatPhpCurrency(flower.pricePhp)} per pc</span>
                      {stockText ? <span className={`stock-note ${soldOut ? "sold-out" : ""}`}>{stockText}</span> : null}
                      {flower.colorChoices.length > 0 ? (
                        <select
                          className="flower-color-select"
                          value={flowerColors[flower.id]}
                          onChange={(event) => setFlowerColors((current) => ({ ...current, [flower.id]: event.target.value }))}
                          aria-label={`${flower.name} color`}
                        >
                          {flower.colorChoices.map((color) => (
                            <option key={color.name} value={color.name}>{color.name}</option>
                          ))}
                        </select>
                      ) : null}
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
                        disabled={totalFlowerCount >= maxFlowerCount || flowerCounts[flower.id] >= stockLimit(flower.stock)}
                      >
                        +
                      </button>
                    </div>
                  </article>
                  );
                })}
              </div>
            </div>

            {fillers.length > 0 ? (
              <div className="customize-section">
                <div className="customize-section-heading">
                  <h2>Fillers</h2>
                  <span>{selectedFillerOptions.length} selected</span>
                </div>
                <div className="flower-choice-grid">
                  {fillers.map((filler) => {
                    const isSelected = selectedFillers.includes(filler.id);
                    const soldOut = isSoldOut(filler.stock);
                    const stockText = stockLabel(filler.stock, filler.stockUnit ?? "bunches");
                    return (
                      <article key={filler.id} className={`flower-choice ${isSelected ? "selected" : ""} ${soldOut ? "sold-out" : ""}`}>
                        <span className="flower-dot" style={{ backgroundColor: filler.colors[0] }} aria-hidden="true" />
                        <div>
                          <strong>{filler.name}</strong>
                          <span>+{formatPhpCurrency(filler.pricePhp)}</span>
                          {stockText ? <span className={`stock-note ${soldOut ? "sold-out" : ""}`}>{stockText}</span> : null}
                        </div>
                        <button
                          type="button"
                          className={`filler-toggle ${isSelected ? "selected" : ""}`}
                          onClick={() => toggleFiller(filler.id)}
                          disabled={soldOut && !isSelected}
                          aria-pressed={isSelected}
                          aria-label={`${isSelected ? "Remove" : "Add"} ${filler.name}`}
                        >
                          {isSelected ? "Added" : "Add"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        ) : step === "style" ? (
          <>
            <div className="customize-section">
              <div className="customize-section-title">
                <h2>Color Palette</h2>
                <span className="info-tooltip">
                  <button type="button" className="info-tooltip-trigger" aria-describedby="palette-tooltip" aria-label="About the color palette">
                    i
                  </button>
                  <span id="palette-tooltip" role="tooltip" className="info-tooltip-bubble">
                    The palette is only applied to the wrapper and ribbon. Your flowers keep the colors you chose for them.
                  </span>
                </span>
              </div>
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
                    {palette.pricePhp > 0 ? <small>+{formatPhpCurrency(palette.pricePhp)}</small> : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="customize-section">
              <h2>Wrap Style</h2>
              <div className={`pill-choice-grid ${wraps.some((wrap) => wrap.imageUrl) ? "has-images" : ""}`}>
                {wraps.map((wrap) => (
                  <button
                    key={wrap.id}
                    type="button"
                    className={`custom-choice ${wrap.imageUrl ? "wrap-choice-with-image" : ""} ${selectedWrap === wrap.id ? "selected" : ""}`}
                    onClick={() => setSelectedWrap(wrap.id)}
                    aria-pressed={selectedWrap === wrap.id}
                  >
                    {wrap.imageUrl ? <img src={resolveImagePath(wrap.imageUrl, 400)} alt="" loading="lazy" /> : null}
                    <span>
                      {wrap.name}
                      {wrap.pricePhp > 0 ? <small className="custom-choice-price">+{formatPhpCurrency(wrap.pricePhp)}</small> : null}
                    </span>
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
                    {ribbon.pricePhp > 0 ? <small className="custom-choice-price">+{formatPhpCurrency(ribbon.pricePhp)}</small> : null}
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
              <div className={`custom-preview-image-wrap ${isPreviewLoading ? "is-loading" : ""}`} aria-busy={isPreviewLoading}>
                {isPreviewLoading ? (
                  <LoadingBloom
                    label="Arranging your bouquet preview…"
                    hint="This can sometimes take a few minutes while we make sure every flower is right. Please wait."
                  />
                ) : (
                  <img src={previewImage} alt="Preview of your customized bouquet" />
                )}
              </div>
              {currentPreview?.status === "failed" ? (
                <p className="custom-preview-note">Showing a similar bouquet. Your florist will follow your exact choices.</p>
              ) : null}
              <CustomBouquetDetails summary={bouquetSummary} className="custom-preview-details" />
              <div className="custom-preview-summary">
                <strong>{formatPhpCurrency(totalPrice)}</strong>
              </div>
              <div className="custom-preview-actions">
                <button type="button" className="custom-preview-cancel" onClick={() => setStep("style")}>
                  Back
                </button>
                <button type="button" className="proceed-button" onClick={handleAddCustomBouquet} disabled={isPreviewLoading}>
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
