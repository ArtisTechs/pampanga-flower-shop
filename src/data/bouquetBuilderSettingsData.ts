import type { BouquetBuilderSettingItem, BouquetBuilderSettingTab } from "../types/shop";

export const bouquetBuilderTabs: BouquetBuilderSettingTab[] = [
  "Sizes",
  "Flower Varieties",
  "Color Palettes",
  "Wrap Style",
  "Ribbon Design"
];

export const bouquetBuilderSettings: Record<BouquetBuilderSettingTab, BouquetBuilderSettingItem[]> = {
  Sizes: [
    {
      id: "size-small",
      name: "Small",
      description: "A sweet, simple bouquet perfect for a small but thoughtful gesture.",
      available: true
    },
    {
      id: "size-medium",
      name: "Medium",
      description: "A balanced bouquet that makes a lovely and noticeable gift.",
      available: true
    },
    {
      id: "size-large",
      name: "Large",
      description: "A full and eye-catching bouquet that beautifully stands out.",
      available: true
    },
    {
      id: "size-extra-large",
      name: "Extra Large",
      description: "An abundant bouquet designed to make a big and memorable impression.",
      available: true
    },
    {
      id: "size-deluxe",
      name: "Deluxe",
      description: "A premium, luxurious bouquet crafted for the most special moments.",
      available: true
    }
  ],
  "Flower Varieties": [
    {
      id: "flower-roses",
      name: "Roses",
      description: "Classic and romantic flowers that symbolize love and elegance.",
      available: true
    },
    {
      id: "flower-tulips",
      name: "Tulips",
      description: "Simple and graceful blooms that represent happiness and fresh beginnings.",
      available: true
    },
    {
      id: "flower-sunflowers",
      name: "Sunflowers",
      description: "Bright and cheerful flowers that bring warmth and positivity.",
      available: true
    },
    {
      id: "flower-daisies",
      name: "Daisies",
      description: "Light and charming blooms that symbolize innocence and joy.",
      available: true
    },
    {
      id: "flower-peonies",
      name: "Peonies",
      description: "Soft and luxurious flowers known for their full petals and timeless beauty.",
      available: true
    }
  ],
  "Color Palettes": [
    {
      id: "palette-purple",
      name: "Purple",
      description: "Classic romantic tones with soft violet and lavender accents.",
      available: true
    },
    {
      id: "palette-blush",
      name: "Blush",
      description: "Gentle pink shades for a sweet and elegant bouquet.",
      available: true
    },
    {
      id: "palette-ivory",
      name: "Ivory",
      description: "Warm neutral flowers for a clean and graceful arrangement.",
      available: true
    },
    {
      id: "palette-burgundy",
      name: "Burgundy",
      description: "Deep red tones for dramatic and refined occasions.",
      available: true
    },
    {
      id: "palette-orange",
      name: "Orange",
      description: "Vibrant sunset colors for bright, joyful celebrations.",
      available: true
    }
  ],
  "Wrap Style": [
    {
      id: "wrap-kraft",
      name: "Kraft Paper",
      description: "A natural wrap style that keeps the bouquet warm and rustic.",
      available: true
    },
    {
      id: "wrap-korean",
      name: "Korean Wrap",
      description: "Layered paper wrapping with a soft, modern floral shop finish.",
      available: true
    },
    {
      id: "wrap-vellum",
      name: "Vellum Wrap",
      description: "Semi-transparent wrapping for a delicate and polished look.",
      available: true
    },
    {
      id: "wrap-burlap",
      name: "Burlap Wrap",
      description: "Textured wrap for organic bouquets and countryside-inspired gifts.",
      available: true
    }
  ],
  "Ribbon Design": [
    {
      id: "ribbon-satin",
      name: "Satin Bow",
      description: "Smooth ribbon with a clean bow for classic flower arrangements.",
      available: true
    },
    {
      id: "ribbon-sheer",
      name: "Sheer Ribbon",
      description: "Light translucent ribbon that adds a soft decorative finish.",
      available: true
    },
    {
      id: "ribbon-lace",
      name: "Lace Tie",
      description: "A delicate lace accent for romantic and vintage-inspired bouquets.",
      available: true
    },
    {
      id: "ribbon-gold",
      name: "Gold Edge",
      description: "Refined ribbon with a subtle gold edge for premium arrangements.",
      available: true
    }
  ]
};
