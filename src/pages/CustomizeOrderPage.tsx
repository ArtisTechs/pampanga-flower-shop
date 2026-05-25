import { useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import type { ToastTone } from "../components/AppToast";
import type { ProductItem } from "../types/shop";
import { formatPhpCurrency } from "../utils/currency";

type BouquetSizeId = "small" | "medium" | "large";
type FlowerId = "roses" | "tulips" | "sunflowers" | "daisies" | "peonies";
type PaletteId = "red" | "blush" | "ivory" | "purple" | "burgundy" | "orange";
type WrapId = "kraft" | "korean" | "mesh" | "transparent";
type RibbonId = "satin" | "velvet" | "twine";
type CustomizeStep = "flowers" | "style" | "preview";

interface PreviewOption {
  image: string;
  flowers: FlowerId[];
  palettes: PaletteId[];
  wraps: WrapId[];
  ribbons: RibbonId[];
}

interface CustomizeOrderPageProps {
  onAddToCart: (product: ProductItem, quantity: number) => boolean;
  onToast: (message: string, tone: ToastTone) => void;
}

const bouquetSizes: Array<{ id: BouquetSizeId; label: string; pricePhp: number }> = [
  { id: "small", label: "Small", pricePhp: 850 },
  { id: "medium", label: "Medium", pricePhp: 1500 },
  { id: "large", label: "Large", pricePhp: 2200 }
];

const flowers: Array<{ id: FlowerId; label: string; color: string }> = [
  { id: "roses", label: "Roses", color: "#ce2424" },
  { id: "tulips", label: "Tulips", color: "#ff8b84" },
  { id: "sunflowers", label: "Sunflowers", color: "#f3c228" },
  { id: "daisies", label: "Daisies", color: "#f1da4f" },
  { id: "peonies", label: "Peonies", color: "#ff9eb6" }
];

const palettes: Array<{ id: PaletteId; label: string; colors: string[] }> = [
  { id: "red", label: "Red", colors: ["#c91f1f", "#e43b31", "#ff4b36"] },
  { id: "blush", label: "Blush", colors: ["#e87072", "#f5988c", "#f6d5ce"] },
  { id: "ivory", label: "Ivory", colors: ["#eeece0", "#d8bd72", "#eee1b5"] },
  { id: "purple", label: "Purple", colors: ["#8e19f4", "#9160d9", "#aa89de"] },
  { id: "burgundy", label: "Burgundy", colors: ["#7c171d", "#9f2828", "#ce3634"] },
  { id: "orange", label: "Orange", colors: ["#d15e00", "#e0781d", "#ff7817"] }
];

const wraps: Array<{ id: WrapId; label: string }> = [
  { id: "kraft", label: "Kraft Paper" },
  { id: "korean", label: "Korean Style" },
  { id: "mesh", label: "Mesh Wrapper" },
  { id: "transparent", label: "Transparent" }
];

const ribbons: Array<{ id: RibbonId; label: string }> = [
  { id: "satin", label: "Satin Ribbon" },
  { id: "velvet", label: "Velvet Ribbon" },
  { id: "twine", label: "Twine" }
];

const previewOptionsByFlowerCount: Record<number, PreviewOption[]> = {
  1: [
    {
      image: "/images/customize-previews/1-flower/single-blush-rose-transparent-wrap-peach-ribbon.webp",
      flowers: ["roses"],
      palettes: ["blush"],
      wraps: ["transparent"],
      ribbons: ["satin"]
    },
    {
      image: "/images/customize-previews/1-flower/single-ivory-rose-kraft-wrap-twine.webp",
      flowers: ["roses"],
      palettes: ["ivory"],
      wraps: ["kraft"],
      ribbons: ["twine"]
    },
    {
      image: "/images/customize-previews/1-flower/single-purple-rose-transparent-wrap-purple-ribbon.webp",
      flowers: ["roses"],
      palettes: ["purple"],
      wraps: ["transparent"],
      ribbons: ["velvet"]
    },
    {
      image: "/images/customize-previews/1-flower/single-red-rose-burgundy-wrap-twine.webp",
      flowers: ["roses"],
      palettes: ["burgundy"],
      wraps: ["korean"],
      ribbons: ["twine"]
    },
    {
      image: "/images/customize-previews/1-flower/single-red-rose-kraft-wrap-red-ribbon.webp",
      flowers: ["roses"],
      palettes: ["red"],
      wraps: ["kraft"],
      ribbons: ["satin", "velvet"]
    }
  ],
  2: [
    {
      image: "/images/customize-previews/2-flowers/two-blush-roses-burgundy-wrap-velvet-ribbon.webp",
      flowers: ["roses", "peonies"],
      palettes: ["blush", "burgundy"],
      wraps: ["korean"],
      ribbons: ["velvet"]
    },
    {
      image: "/images/customize-previews/2-flowers/two-pink-roses-transparent-wrap-burgundy-ribbon.webp",
      flowers: ["roses", "peonies"],
      palettes: ["blush", "burgundy"],
      wraps: ["transparent"],
      ribbons: ["velvet"]
    },
    {
      image: "/images/customize-previews/2-flowers/two-red-roses-kraft-wrap-red-ribbon.webp",
      flowers: ["roses"],
      palettes: ["red", "burgundy"],
      wraps: ["kraft"],
      ribbons: ["satin", "velvet"]
    },
    {
      image: "/images/customize-previews/2-flowers/two-sunflower-blush-rose-peach-wrap-satin-ribbon.webp",
      flowers: ["sunflowers", "roses"],
      palettes: ["blush", "orange"],
      wraps: ["korean"],
      ribbons: ["satin"]
    },
    {
      image: "/images/customize-previews/2-flowers/two-sunflower-daisy-kraft-wrap-twine.webp",
      flowers: ["sunflowers", "daisies"],
      palettes: ["ivory", "orange"],
      wraps: ["kraft"],
      ribbons: ["twine"]
    }
  ],
  3: [
    {
      image: "/images/customize-previews/3-flowers/three-red-blush-roses-burgundy-wrap-twine.webp",
      flowers: ["roses", "peonies"],
      palettes: ["red", "burgundy", "blush"],
      wraps: ["korean"],
      ribbons: ["twine"]
    },
    {
      image: "/images/customize-previews/3-flowers/three-rose-sunflower-kraft-wrap-burgundy-ribbon.webp",
      flowers: ["roses", "sunflowers"],
      palettes: ["red", "orange"],
      wraps: ["kraft"],
      ribbons: ["velvet"]
    },
    {
      image: "/images/customize-previews/3-flowers/three-sunflower-pink-roses-kraft-wrap-twine.webp",
      flowers: ["sunflowers", "roses"],
      palettes: ["blush", "orange", "ivory"],
      wraps: ["kraft"],
      ribbons: ["twine"]
    },
    {
      image: "/images/customize-previews/3-flowers/three-sunflower-pink-roses-peach-wrap-satin-ribbon.webp",
      flowers: ["sunflowers", "roses", "peonies"],
      palettes: ["blush", "orange"],
      wraps: ["korean"],
      ribbons: ["satin"]
    },
    {
      image: "/images/customize-previews/3-flowers/three-sunflowers-transparent-wrap-green-ribbon.webp",
      flowers: ["sunflowers", "daisies"],
      palettes: ["orange", "ivory"],
      wraps: ["transparent"],
      ribbons: ["twine"]
    }
  ],
  4: [
    {
      image: "/images/customize-previews/4-flowers/four-pink-tulips-rose-burgundy-wrap-velvet-ribbon.webp",
      flowers: ["tulips", "roses"],
      palettes: ["blush", "burgundy"],
      wraps: ["korean"],
      ribbons: ["velvet"]
    },
    {
      image: "/images/customize-previews/4-flowers/four-sunflower-daisies-pink-rose-peach-wrap-satin-ribbon.webp",
      flowers: ["sunflowers", "daisies", "roses", "peonies"],
      palettes: ["blush", "orange", "ivory"],
      wraps: ["korean"],
      ribbons: ["satin"]
    },
    {
      image: "/images/customize-previews/4-flowers/four-sunflower-pink-rose-kraft-wrap-red-ribbon.webp",
      flowers: ["sunflowers", "roses", "peonies"],
      palettes: ["red", "orange", "blush"],
      wraps: ["kraft"],
      ribbons: ["satin", "velvet"]
    },
    {
      image: "/images/customize-previews/4-flowers/four-sunflower-pink-rose-transparent-wrap-purple-ribbon.webp",
      flowers: ["sunflowers", "roses", "peonies"],
      palettes: ["purple", "blush", "orange"],
      wraps: ["transparent"],
      ribbons: ["velvet"]
    },
    {
      image: "/images/customize-previews/4-flowers/four-sunflowers-red-rose-kraft-wrap-twine.webp",
      flowers: ["sunflowers", "roses"],
      palettes: ["red", "orange"],
      wraps: ["kraft"],
      ribbons: ["twine"]
    }
  ],
  5: [
    {
      image: "/images/customize-previews/5-flowers/five-mixed-pink-red-sunflower-white-wrap-satin-ribbon.webp",
      flowers: ["roses", "sunflowers", "daisies", "peonies"],
      palettes: ["red", "blush", "ivory", "orange"],
      wraps: ["transparent"],
      ribbons: ["satin"]
    },
    {
      image: "/images/customize-previews/5-flowers/five-pink-roses-peonies-white-wrap-purple-ribbon.webp",
      flowers: ["roses", "peonies"],
      palettes: ["purple", "blush"],
      wraps: ["transparent"],
      ribbons: ["velvet"]
    },
    {
      image: "/images/customize-previews/5-flowers/five-red-roses-kraft-wrap-burgundy-ribbon.webp",
      flowers: ["roses"],
      palettes: ["red", "burgundy"],
      wraps: ["kraft"],
      ribbons: ["velvet", "twine"]
    },
    {
      image: "/images/customize-previews/5-flowers/five-sunflowers-kraft-wrap-twine.webp",
      flowers: ["sunflowers"],
      palettes: ["orange", "ivory"],
      wraps: ["kraft"],
      ribbons: ["twine"]
    },
    {
      image: "/images/customize-previews/5-flowers/five-sunflowers-pink-roses-kraft-wrap-satin-ribbon.webp",
      flowers: ["sunflowers", "roses", "peonies"],
      palettes: ["blush", "orange"],
      wraps: ["kraft", "korean"],
      ribbons: ["satin"]
    }
  ]
};

const choiceFrom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const maxFlowerCount = 5;

export const CustomizeOrderPage = ({ onAddToCart, onToast }: CustomizeOrderPageProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<CustomizeStep>("flowers");
  const [selectedSize, setSelectedSize] = useState<BouquetSizeId>("medium");
  const [flowerCounts, setFlowerCounts] = useState<Record<string, number>>(
    Object.fromEntries(flowers.map((flower) => [flower.id, 0]))
  );
  const [selectedPalette, setSelectedPalette] = useState<PaletteId>("blush");
  const [selectedWrap, setSelectedWrap] = useState<WrapId>("korean");
  const [selectedRibbon, setSelectedRibbon] = useState<RibbonId>("satin");
  const [showAddedPrompt, setShowAddedPrompt] = useState(false);
  const [flyAnimation, setFlyAnimation] = useState<{
    id: number;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  } | null>(null);

  const selectedSizeOption = bouquetSizes.find((size) => size.id === selectedSize) ?? bouquetSizes[0];
  const selectedPaletteOption = palettes.find((palette) => palette.id === selectedPalette) ?? palettes[0];
  const selectedWrapOption = wraps.find((wrap) => wrap.id === selectedWrap) ?? wraps[0];
  const selectedRibbonOption = ribbons.find((ribbon) => ribbon.id === selectedRibbon) ?? ribbons[0];
  const selectedFlowers = flowers.filter((flower) => flowerCounts[flower.id] > 0);
  const totalFlowerCount = selectedFlowers.reduce((total, flower) => total + flowerCounts[flower.id], 0);
  const totalPrice = useMemo(
    () => selectedSizeOption.pricePhp + totalFlowerCount * 40,
    [selectedSizeOption.pricePhp, totalFlowerCount]
  );
  const previewImage = useMemo(() => {
    const countKey = Math.max(1, Math.min(maxFlowerCount, totalFlowerCount));
    const options = previewOptionsByFlowerCount[countKey];
    const selectedFlowerIds = selectedFlowers.map((flower) => flower.id);
    const dominantFlower = selectedFlowers.reduce<{ id: FlowerId; count: number } | null>((dominant, flower) => {
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
  }, [flowerCounts, selectedFlowers, selectedPalette, selectedRibbon, selectedWrap, totalFlowerCount]);

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
    setSelectedSize("medium");
    setFlowerCounts(Object.fromEntries(flowers.map((flower) => [flower.id, 0])));
    setSelectedPalette("blush");
    setSelectedWrap("korean");
    setSelectedRibbon("satin");
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
      .map((flower) => `${flower.label} x${flowerCounts[flower.id]}`)
      .join(", ");
    const product: ProductItem = {
      id: `custom-${Date.now()}`,
      name: `Custom ${selectedSizeOption.label} Bouquet - ${selectedPaletteOption.label}, ${selectedWrapOption.label}, ${selectedRibbonOption.label} (${flowerSummary})`,
      pricePhp: totalPrice,
      image: previewImage
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
                    <span>{size.label}</span>
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
                    <span className="flower-dot" style={{ backgroundColor: flower.color }} aria-hidden="true" />
                    <div>
                      <strong>{flower.label}</strong>
                      <span>+40 PHP per pc</span>
                    </div>
                    <div className="flower-stepper" aria-label={`${flower.label} quantity`}>
                      <button type="button" onClick={() => updateFlowerCount(flower.id, -1)} aria-label={`Remove ${flower.label}`}>
                        -
                      </button>
                      <span>{flowerCounts[flower.id]}</span>
                      <button
                        type="button"
                        onClick={() => updateFlowerCount(flower.id, 1)}
                        aria-label={`Add ${flower.label}`}
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
                    <strong>{palette.label}</strong>
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
                    {wrap.label}
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
                    {ribbon.label}
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
                <span>{selectedSizeOption.label}</span>
                <span>{selectedPaletteOption.label}</span>
                <span>{selectedWrapOption.label}</span>
                <span>{selectedRibbonOption.label}</span>
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
