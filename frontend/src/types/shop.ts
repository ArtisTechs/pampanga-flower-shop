export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

export interface OccasionCard {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  route: string;
}

export interface FlowerTypeCard {
  id: string;
  name: string;
  label: string;
  image: string;
  route: string;
}

export interface FeatureItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface Testimonial {
  id: string;
  name: string;
  quote: string;
  rating: number;
}

export interface HomePerk {
  id: string;
  icon: string;
  label: string;
}

export interface HomeStep {
  id: string;
  icon: "flowers" | "palette" | "check";
  description: string;
}

export interface HomeContent {
  occasionCards: OccasionCard[];
  flowerTypeCards: FlowerTypeCard[];
  features: FeatureItem[];
  perks: HomePerk[];
  steps: HomeStep[];
  testimonials: Testimonial[];
}

/** Admin-editable text. Headings may wrap words in *asterisks* to highlight them (see EmphasisText). */
export interface SiteContent {
  bannerTitle: string;
  bannerSubtitle: string;
  shopName: string;
  operatingHours: string;
  fullAddress: string;
  aboutText: string;
  heroTagline: string;
  heroSecondaryCta: string;
  occasionsHeading: string;
  flowerTypesHeading: string;
  featuresHeading: string;
  philosophyBannerTitle: string;
  philosophyBannerText: string;
  philosophyHeading: string;
  howItWorksHeading: string;
  howItWorksSubtitle: string;
  reviewsHeading: string;
  reviewsSubtitle: string;
  pickupMethod: string;
  paymentMethod: string;
}

export type CatalogCollection = "best-sellers" | "occasions" | "flowers";

/** What the customer picked in the bouquet builder; sent to the API, which prices it. */
export interface BouquetSelection {
  size: string;
  palette: string;
  wrap: string;
  ribbon: string;
  flowers: Array<{ code: string; quantity: number }>;
}

export interface ProductItem {
  id: string;
  name: string;
  description?: string;
  pricePhp: number;
  image: string;
  bestSeller?: boolean;
  catalogFilters?: string[];
  custom?: {
    selection: BouquetSelection;
    wrapName: string;
    ribbonName: string;
  };
}

export interface CatalogListing {
  title: string;
  filters: Array<{ id: string; label: string }>;
  products: ProductItem[];
}

export interface ProductCategory {
  id: string;
  title: string;
  route: string;
  collectionType: "occasions" | "flowers";
}

export interface CartItem extends ProductItem {
  quantity: number;
}

export interface PlacedOrder {
  id: string;
  totalPhp: number;
  pickupAt: string;
  status: AdminOrderStatus;
}

export interface BuilderOption {
  id: string;
  name: string;
  description: string;
  pricePhp: number;
  colors: string[];
}

export interface BuilderPreview {
  flowerCount: number;
  image: string;
  flowers: string[];
  palettes: string[];
  wraps: string[];
  ribbons: string[];
}

export interface BuilderConfig {
  sizes: BuilderOption[];
  flowers: BuilderOption[];
  palettes: BuilderOption[];
  wraps: BuilderOption[];
  ribbons: BuilderOption[];
  previews: BuilderPreview[];
  /** Starting option id per group (the admin default, or the first available option). */
  defaults: Record<"size" | "palette" | "wrap" | "ribbon", string>;
  maxFlowers: number;
}

export type AccountRole = "user" | "admin";

export interface Account {
  id: string;
  role: AccountRole;
  fullName: string;
  email: string;
  contactNumber: string;
  avatarInitials: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  contactNumber: string;
}

export interface AdminDashboardStat {
  id: string;
  label: string;
  value: string;
  icon: "bag" | "peso" | "clock" | "alert";
}

export interface AdminLowStockFlower {
  id: string;
  name: string;
  threshold: number;
  currentStock: number;
}

export type AdminOrderStatus = "Pending" | "Ready" | "Completed";

export interface AdminOrder {
  id: string;
  customerName: string;
  contactNumber: string;
  bouquetSize: string | null;
  pickupAt: string;
  totalPhp: number;
  status: AdminOrderStatus;
}

export interface AdminDashboard {
  totalOrders: number;
  totalSalesPhp: number;
  pendingPickups: number;
  lowStock: AdminLowStockFlower[];
  recentOrders: AdminOrder[];
}

export interface AdminReports {
  totalOrders: number;
  totalRevenuePhp: number;
  averageOrderPhp: number;
  popularFlowers: Array<{ id: string; name: string; orders: number }>;
}

export interface InventoryItem {
  id: string;
  kind: "flower" | "add-on";
  name: string;
  description: string;
  threshold: number;
  inStock: number;
  capacity: number;
  unit: string;
}

export type AdminUserStatus = "Active" | "Disabled";
export type AdminUserRole = "Customer" | "VIP";

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  contactNumber: string;
  status: AdminUserStatus;
  role: AdminUserRole;
}

export interface AdminProduct {
  id: string;
  categoryId: string;
  categoryTitle: string;
  name: string;
  description: string;
  pricePhp: number;
  /** Public-folder path (seeded products) or Cloudinary URL (uploaded); display via resolveImagePath(). */
  imagePath: string;
  bestSeller: boolean;
  active: boolean;
}

export type AdminProductInput = Omit<AdminProduct, "id" | "categoryTitle">;

export type BuilderOptionGroup = "size" | "flower" | "palette" | "wrap" | "ribbon";

export interface AdminBuilderOption extends BuilderOption {
  group: BuilderOptionGroup;
  code: string;
  available: boolean;
}

export type BouquetBuilderSettingTab =
  | "Sizes"
  | "Flower Varieties"
  | "Color Palettes"
  | "Wrap Style"
  | "Ribbon Design";
