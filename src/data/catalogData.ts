import type { ProductCategory, ProductItem } from "../types/shop";
import { flowerProductImage, occasionProductImage } from "./imagePaths";

const bestSellerIds = new Set([
  "analia",
  "expressions",
  "sweet-rosie",
  "beloved",
  "sunshine",
  "combo",
  "medium-fruit",
  "into-you",
  "deep-love",
  "blush",
  "everlasting",
  "condolence",
  "round",
  "princess-t",
  "peach",
  "amalia",
  "deeply",
  "crimson",
  "sun-fruits",
  "princess-l",
  "beautiful-l"
]);

const withCatalogFilterData = (
  products: ProductItem[],
  catalogFilter: "occasions" | "flowers"
) =>
  products.map((product) => ({
    ...product,
    bestSeller: bestSellerIds.has(product.id),
    catalogFilters: [
      catalogFilter,
      ...(bestSellerIds.has(product.id) ? (["best-sellers"] as const) : [])
    ]
  }));

const flattenProducts = (entries: ProductCategory[]) =>
  entries.flatMap((entry) =>
    entry.products.map((product) => ({
      ...product,
      id: `${entry.id}-${product.id}`
    }))
  );

const baseCategories: ProductCategory[] = [
  {
    id: "anniversary",
    title: "Anniversary Flowers",
    route: "/category/anniversary",
    products: [
      { id: "analia", name: "Analia", pricePhp: 3890, image: occasionProductImage("anniversary", "rose1.jpg") },
      { id: "carmine", name: "Carmine", pricePhp: 3090, image: occasionProductImage("anniversary", "rose2.jpg") },
      { id: "expressions", name: "Expressions of Love", pricePhp: 2790, image: occasionProductImage("anniversary", "rose3.jpg") },
      { id: "sincere", name: "Sincere Love", pricePhp: 2690, image: occasionProductImage("anniversary", "rose4.jpg") },
      { id: "candy", name: "Candy Rush", pricePhp: 2990, image: occasionProductImage("anniversary", "rose5.jpg") },
      { id: "pink", name: "Pink Bubbles", pricePhp: 2990, image: occasionProductImage("anniversary", "rose6.jpg") }
    ]
  },
  {
    id: "birthday", title: "Birthday Flowers", route: "/category/birthday", products: [
      { id: "amity", name: "Amity", pricePhp: 3090, image: occasionProductImage("birthday", "birthday1.jpg") },
      { id: "sweeter", name: "Sweeter Blooms", pricePhp: 3690, image: occasionProductImage("birthday", "birthday2.jpg") },
      { id: "sweet-rosie", name: "Sweet Rosie", pricePhp: 3890, image: occasionProductImage("birthday", "birthday3.jpg") },
      { id: "beloved", name: "The Beloved Birthday", pricePhp: 3390, image: occasionProductImage("birthday", "birthday4.jpg") },
      { id: "yours", name: "Yours Truly", pricePhp: 2390, image: occasionProductImage("birthday", "birthday5.jpg") },
      { id: "peachie", name: "Peachie", pricePhp: 3590, image: occasionProductImage("birthday", "birthday6.jpg") }
    ]
  },
  { id: "congrats", title: "Congratulatory Flowers", route: "/category/congrats", products: [
    { id: "sunshine", name: "Sunshine Galore", pricePhp: 4090, image: occasionProductImage("congrats", "flower1.png") },
    { id: "blushing", name: "Blushing Blooms", pricePhp: 2990, image: occasionProductImage("congrats", "flower2.png") },
    { id: "combo", name: "Perfect Combination", pricePhp: 2990, image: occasionProductImage("congrats", "flower3.png") },
    { id: "bubble", name: "Bubble Gum", pricePhp: 2690, image: occasionProductImage("congrats", "flower4.png") },
    { id: "purple", name: "Purple Dreams", pricePhp: 3190, image: occasionProductImage("congrats", "flower5.png") },
    { id: "darling", name: "Darling Devotion", pricePhp: 2490, image: occasionProductImage("congrats", "flower6.png") }
  ]},
  { id: "getwell", title: "Get Well Picks", route: "/category/getwell", products: [
    { id: "medium-fruit", name: "Medium Fruit Basket", pricePhp: 4090, image: occasionProductImage("getwell", "fruit1.png") },
    { id: "small-fruit", name: "Small Fruit Basket", pricePhp: 2990, image: occasionProductImage("getwell", "fruit2.png") },
    { id: "sun-fruit", name: "Sunflower & Fruit Basket", pricePhp: 2990, image: occasionProductImage("getwell", "fruit3.png") },
    { id: "fire", name: "Fire Sunset", pricePhp: 2690, image: occasionProductImage("getwell", "fruit4.png") },
    { id: "yours-truly", name: "Yours Truly", pricePhp: 3190, image: occasionProductImage("getwell", "fruit5.png") },
    { id: "big-fruit", name: "Big Fruit Basket", pricePhp: 2490, image: occasionProductImage("getwell", "fruit6.png") }
  ]},
  { id: "apology", title: "Apology Flowers", route: "/category/apology", products: [
    { id: "into-you", name: "Into You", pricePhp: 4090, image: occasionProductImage("apology", "ap1.png") },
    { id: "pink-puff", name: "Pink Puff", pricePhp: 2990, image: occasionProductImage("apology", "ap2.png") },
    { id: "sweetheart", name: "Sweetheart", pricePhp: 2990, image: occasionProductImage("apology", "ap3.png") },
    { id: "princess", name: "My Princess", pricePhp: 2690, image: occasionProductImage("apology", "ap4.png") },
    { id: "deep-love", name: "Deeply In Love", pricePhp: 3190, image: occasionProductImage("apology", "ap5.png") },
    { id: "honesty", name: "Red Honesty", pricePhp: 2490, image: occasionProductImage("apology", "ap6.png") }
  ]},
  { id: "romantic", title: "Romantic Flowers", route: "/category/romantic", products: [
    { id: "blush", name: "Blush Rose", pricePhp: 4090, image: occasionProductImage("romantic", "rom1.png") },
    { id: "heaven", name: "Made in Heaven", pricePhp: 2990, image: occasionProductImage("romantic", "rom2.png") },
    { id: "twilight", name: "Twilight", pricePhp: 2990, image: occasionProductImage("romantic", "rom3.png") },
    { id: "princess-r", name: "My Princess", pricePhp: 2690, image: occasionProductImage("romantic", "rom4.png") },
    { id: "everlasting", name: "Everlasting Love", pricePhp: 3190, image: occasionProductImage("romantic", "rom5.png") },
    { id: "moment", name: "Your Moment", pricePhp: 2490, image: occasionProductImage("romantic", "rom6.png") }
  ]},
  { id: "sympathy", title: "Sympathy & Funeral Flowers", route: "/category/sympathy", products: [
    { id: "condolence", name: "Condolences Flower Stand", pricePhp: 4090, image: occasionProductImage("sympathy", "symp1.png") },
    { id: "sympathy", name: "Sympathy Flowers", pricePhp: 2990, image: occasionProductImage("sympathy", "symp2.png") },
    { id: "funeral", name: "Funeral Flower Basket", pricePhp: 2990, image: occasionProductImage("sympathy", "symp3.png") },
    { id: "white", name: "White Condolence Flowers", pricePhp: 2690, image: occasionProductImage("sympathy", "symp4.png") },
    { id: "round", name: "Round Condolence Flowers", pricePhp: 3190, image: occasionProductImage("sympathy", "symp5.png") },
    { id: "simple", name: "Simple Sympathy Flowers", pricePhp: 2490, image: occasionProductImage("sympathy", "symp6.png") }
  ]},
  { id: "thankyou", title: "Thank You Flowers", route: "/category/thankyou", products: [
    { id: "princess-t", name: "My Princess", pricePhp: 4090, image: occasionProductImage("thankyou", "thank1.png") },
    { id: "darling-t", name: "Darling Devotion", pricePhp: 2990, image: occasionProductImage("thankyou", "thank2.png") },
    { id: "honesty-t", name: "Red Honesty", pricePhp: 2990, image: occasionProductImage("thankyou", "thank3.png") },
    { id: "beautiful", name: "Beautiful You", pricePhp: 2690, image: occasionProductImage("thankyou", "thank4.png") },
    { id: "peach", name: "Peach Perfect", pricePhp: 3190, image: occasionProductImage("thankyou", "thank5.png") },
    { id: "peachie-t", name: "Peachie", pricePhp: 2490, image: occasionProductImage("thankyou", "thank6.png") }
  ]},
  { id: "rose", title: "Roses", route: "/flowers/rose", products: [
    { id: "amalia", name: "Amalia", pricePhp: 4090, image: flowerProductImage("rose", "r1.png") },
    { id: "lavish", name: "Lavish Love", pricePhp: 2990, image: flowerProductImage("rose", "r2.png") },
    { id: "queen", name: "You're My Queen", pricePhp: 2990, image: flowerProductImage("rose", "r3.png") },
    { id: "cupid", name: "Sweet Cupid", pricePhp: 2690, image: flowerProductImage("rose", "r4.png") },
    { id: "deeply", name: "Deeply in Love", pricePhp: 3190, image: flowerProductImage("rose", "r5.png") },
    { id: "mercedes", name: "Mercedes", pricePhp: 2490, image: flowerProductImage("rose", "r6.png") }
  ]},
  { id: "sunflower", title: "Sunflowers", route: "/flowers/sunflower", products: [
    { id: "crimson", name: "Crimson Sun", pricePhp: 4090, image: flowerProductImage("sunflower", "s1.png") },
    { id: "sunny", name: "A Sunny Surprise", pricePhp: 2990, image: flowerProductImage("sunflower", "s2.png") },
    { id: "basket", name: "Basket of Sun", pricePhp: 2990, image: flowerProductImage("sunflower", "s3.png") },
    { id: "full", name: "Full Sunflower Bouquet", pricePhp: 2690, image: flowerProductImage("sunflower", "s4.png") },
    { id: "sun-fruits", name: "Sunflower & Fruits Basket", pricePhp: 3190, image: flowerProductImage("sunflower", "s5.png") },
    { id: "fire-s", name: "Fire Sunset", pricePhp: 2490, image: flowerProductImage("sunflower", "s6.png") }
  ]},
  { id: "lily", title: "Lilies", route: "/flowers/lily", products: [
    { id: "princess-l", name: "My Princess", pricePhp: 4090, image: flowerProductImage("lily", "lily1.png") },
    { id: "darling-l", name: "Darling Devotion", pricePhp: 2990, image: flowerProductImage("lily", "lily2.png") },
    { id: "honesty-l", name: "Red Honesty", pricePhp: 2990, image: flowerProductImage("lily", "lily3.png") },
    { id: "beautiful-l", name: "Beautiful You", pricePhp: 2690, image: flowerProductImage("lily", "lily4.png") },
    { id: "peach-l", name: "Peach Perfect", pricePhp: 3190, image: flowerProductImage("lily", "lily5.png") },
    { id: "peachie-l", name: "Peachie", pricePhp: 2490, image: flowerProductImage("lily", "lily6.png") }
  ]}
].map((category) => {
  const catalogFilter = category.route.startsWith("/flowers/") ? "flowers" : "occasions";

  return {
    ...category,
    products: withCatalogFilterData(category.products, catalogFilter)
  };
});

const occasionCategories = baseCategories.filter((category) => category.route.startsWith("/category/"));
const flowerCategories = baseCategories.filter((category) => category.route.startsWith("/flowers/"));
const bestSellerProducts = flattenProducts(baseCategories).filter((product) => product.bestSeller);

export const categories: ProductCategory[] = [
  ...baseCategories,
  {
    id: "best-sellers",
    title: "Best Sellers",
    route: "/collection/best-sellers",
    collectionType: "best-sellers",
    products: bestSellerProducts
  },
  {
    id: "occasions",
    title: "Occasion Flowers",
    route: "/collection/occasions",
    collectionType: "occasions",
    products: flattenProducts(occasionCategories)
  },
  {
    id: "flowers",
    title: "Flower Bouquets",
    route: "/collection/flowers",
    collectionType: "flowers",
    products: flattenProducts(flowerCategories)
  }
];
