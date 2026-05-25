import type { FeatureItem, FlowerTypeCard, NavItem, OccasionCard, ReviewCard } from "../types/shop";
import { categoryImage } from "./imagePaths";

export const navItems: NavItem[] = [
  { label: "Home", href: "#home" },
  {
    label: "Features",
    href: "#features",
    children: [
      { label: "Features", href: "#features" },
      { label: "Flower Types", href: "#flower-types" },
      { label: "Our Philosophy", href: "#philosophy" },
      { label: "Customer Reviews", href: "#reviews" }
    ]
  },
  { label: "Start Customizing", href: "#customization" }
];

export const occasionCards: OccasionCard[] = [
  { id: "anniversary", title: "Anniversary Picks", subtitle: "Anniversary Flowers", image: categoryImage("occasions", "anniversary.jpg"), route: "/category/anniversary" },
  { id: "birthday", title: "Birthday Picks", subtitle: "Birthday Flowers", image: categoryImage("occasions", "birthday.jpg"), route: "/category/birthday" },
  { id: "congrats", title: "Congratulatory Picks", subtitle: "Congratulatory Flowers", image: categoryImage("occasions", "congrats.jpg"), route: "/category/congrats" },
  { id: "getwell", title: "Get Well Picks", subtitle: "Get Well Picks", image: categoryImage("occasions", "getwell.jpg"), route: "/category/getwell" },
  { id: "apology", title: "Apology Picks", subtitle: "Apology Flowers", image: categoryImage("occasions", "apology.jpg"), route: "/category/apology" },
  { id: "romantic", title: "Romantic Picks", subtitle: "Romantic Flowers", image: categoryImage("occasions", "romantic.jpg"), route: "/category/romantic" },
  { id: "sympathy", title: "Sympathy Picks", subtitle: "Sympathy & Funeral Flowers", image: categoryImage("occasions", "sympathy.jpg"), route: "/category/sympathy" },
  { id: "thankyou", title: "Thank You Picks", subtitle: "Thank You Flowers", image: categoryImage("occasions", "thankyou.jpg"), route: "/category/thankyou" }
];

export const flowerTypeCards: FlowerTypeCard[] = [
  { id: "rose", name: "Roses", label: "Rose Bouquets", image: categoryImage("flower-types", "roses.jpg"), route: "/flowers/rose" },
  { id: "sunflower", name: "Sunflowers", label: "Sunflower Bouquets", image: categoryImage("flower-types", "sunflowers.jpg"), route: "/flowers/sunflower" },
  { id: "lily", name: "Lilies", label: "Lily Bouquets", image: categoryImage("flower-types", "lilies.jpg"), route: "/flowers/lily" },
  { id: "carnation", name: "Carnations", label: "Carnation Bouquets", image: categoryImage("flower-types", "carnations.jpg"), route: "/flowers/carnation" },
  { id: "tulip", name: "Tulips", label: "Tulip Bouquets", image: categoryImage("flower-types", "tulips.jpg"), route: "/flowers/tulip" },
  { id: "gerbera", name: "Gerberas", label: "Gerbera Bouquets", image: categoryImage("flower-types", "gerberas.jpg"), route: "/flowers/gerbera" }
];

export const features: FeatureItem[] = [
  { id: "custom", icon: "🌟", title: "Fully Customizable", description: "Choose every detail — flowers, colors, wrapping, and ribbon to create your perfect bouquet." },
  { id: "love", icon: "💗", title: "Made with Love", description: "Each bouquet is handcrafted by our expert florists using the freshest seasonal blooms." },
  { id: "occasion", icon: "🎁", title: "Perfect for Any Occasion", description: "Birthdays, anniversaries, weddings, or just because — we have the perfect arrangement." }
];

export const reviews: ReviewCard[] = [
  {
    id: "sofia",
    name: "Sofia R.",
    summary: "The bouquet builder is so fun! I designed exactly what I envisioned and it arrived even more beautiful.",
    bullets: ["S"],
    actionText: "★★★★★"
  },
  {
    id: "avril",
    name: "Avril A.",
    summary: "Absolutely stunning quality. The Korean-style wrap was gorgeous and the peonies were so fresh!",
    bullets: ["A"],
    actionText: "★★★★★"
  },
  {
    id: "jasmine",
    name: "Jasmine T.",
    summary: "I used the Surprise Me feature and got the most gorgeous pastel arrangement. Will order again!",
    bullets: ["J"],
    actionText: "★★★★★"
  }
];
