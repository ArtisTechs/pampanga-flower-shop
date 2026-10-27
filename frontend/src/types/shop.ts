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
  /** color is the name of one of the flower's color choices; carts saved before colors existed leave it out. */
  flowers: Array<{ code: string; quantity: number; color?: string }>;
  fillers: string[];
}

/** A custom bouquet's choices by display name, for showing what the customer picked. */
export interface CustomBouquetSummary {
  size: string;
  palette: string;
  wrap: string;
  ribbon: string;
  flowers: Array<{ name: string; quantity: number; color?: string | null }>;
  fillers: string[];
}

export interface ProductItem {
  id: string;
  name: string;
  description?: string;
  pricePhp: number;
  /** Ready-made bouquets left to order (0 = sold out); missing on custom bouquets. */
  stock?: number;
  image: string;
  bestSeller?: boolean;
  catalogFilters?: string[];
  custom?: {
    selection: BouquetSelection;
    wrapName: string;
    ribbonName: string;
    /** Missing on cart items saved before it existed. */
    summary?: CustomBouquetSummary;
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
  paymentStatus: PaymentStatus;
}

/**
 * "Pay on pick-up" is for orders placed before online payment. New orders start "Awaiting payment",
 * become "For verification" once the screenshot is uploaded, then the admin verifies or rejects it.
 */
export type PaymentStatus = "Pay on pick-up" | "Awaiting payment" | "For verification" | "Verified" | "Rejected";

export type PaymentMethodKind = "Bank" | "E-wallet";

/** Where customers send payment: a bank account or e-wallet, with an optional QR code (Cloudinary URL). */
export interface PaymentMethod {
  id: string;
  kind: PaymentMethodKind;
  provider: string;
  accountName: string;
  accountNumber: string;
  qrImageUrl: string | null;
  active: boolean;
}

export type PaymentMethodInput = Omit<PaymentMethod, "id">;

/** The payment details copied onto an order when it was placed. */
export interface OrderPaymentAccount {
  provider: string;
  accountName: string | null;
  accountNumber: string | null;
}

/** A color a flower can be ordered in; each flower has exactly one default. */
export interface FlowerColor {
  name: string;
  hex: string;
  isDefault: boolean;
}

export interface BuilderOption {
  id: string;
  name: string;
  description: string;
  pricePhp: number;
  colors: string[];
  /** Flowers only: the colors the customer picks from. */
  colorChoices: FlowerColor[];
  /** Wraps only: a photo of how the wrap looks, or null. */
  imageUrl: string | null;
  /** Flowers and fillers: units left (stems / bunches); null when the option isn't stock-limited. */
  stock: number | null;
  stockUnit: string | null;
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
  fillers: BuilderOption[];
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
  firstName: string;
  lastName: string;
  // firstName + lastName, kept by the API for display.
  fullName: string;
  email: string;
  contactNumber: string;
  // Cloudinary URL of the profile photo; null shows avatarInitials instead.
  avatarUrl: string | null;
  avatarInitials: string;
}

export interface ProfileInput {
  firstName: string;
  lastName: string;
  contactNumber: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  contactNumber: string;
  // 6-digit code emailed by requestOtp(email, "signup").
  code: string;
}

export type OtpPurpose = "signup" | "reset";

export interface ResetPasswordInput {
  email: string;
  code: string;
  password: string;
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

export type AdminOrderStatus = "Pending" | "Ready" | "Completed" | "Cancelled";

export interface AdminOrder {
  id: string;
  customerName: string;
  contactNumber: string;
  bouquetSize: string | null;
  pickupAt: string;
  totalPhp: number;
  status: AdminOrderStatus;
  /** Why the order was cancelled (shop, customer, rejected payment or no payment); null otherwise. */
  cancelReason: string | null;
  paymentStatus: PaymentStatus;
}

export interface AdminOrderDetail extends AdminOrder {
  createdAt: string;
  customerEmail: string | null;
  payment: {
    provider: string | null;
    accountName: string | null;
    accountNumber: string | null;
    proofUrl: string | null;
    submittedAt: string | null;
    reviewedAt: string | null;
    note: string | null;
  };
  items: OrderItemDetail[];
}

export interface OrderItemDetail {
  id: number;
  name: string;
  unitPricePhp: number;
  quantity: number;
  image: string | null;
  /** fillers is missing on orders placed before fillers existed. */
  customization: { size: string; palette: string; wrap: string; ribbon: string; fillers?: string[] } | null;
  /** color is null on orders placed before flower colors existed. */
  flowers: Array<{ name: string; quantity: number; color: string | null }>;
}

/** An order as its customer sees it in My Orders. */
export interface CustomerOrder {
  id: string;
  pickupAt: string;
  createdAt: string;
  totalPhp: number;
  status: AdminOrderStatus;
  paymentStatus: PaymentStatus;
  payment: OrderPaymentAccount | null;
  /** The shop's reason when a payment screenshot was rejected. */
  paymentNote: string | null;
  cancelReason: string | null;
  itemCount: number;
  itemNames: string[];
}

export interface CustomerOrderDetail extends CustomerOrder {
  items: OrderItemDetail[];
}

export interface AdminDashboard {
  totalOrders: number;
  totalSalesPhp: number;
  pendingPickups: number;
  lowStock: AdminLowStockFlower[];
  recentOrders: AdminOrder[];
}

export type ReportRange = "7d" | "30d" | "90d" | "12m" | "all";

export interface AdminReports {
  range: ReportRange;
  /** Shop-local dates (YYYY-MM-DD), inclusive. */
  from: string;
  to: string;
  bucket: "day" | "week" | "month";
  totals: { orders: number; revenuePhp: number; averageOrderPhp: number; customRevenueSharePct: number };
  /** Same-length period just before `from`; null for all time. */
  previous: { orders: number; revenuePhp: number } | null;
  timeline: Array<{ start: string; orders: number; revenuePhp: number }>;
  statusCounts: Record<AdminOrderStatus, number>;
  topItems: Array<{ name: string; quantity: number; revenuePhp: number }>;
  popularFlowers: Array<{ id: string; name: string; stems: number; orders: number }>;
}

export interface InventoryItem {
  id: string;
  /** "product" = a ready-made bouquet; it has no storage limit, so capacity only scales the level bar. */
  kind: "flower" | "add-on" | "product";
  name: string;
  description: string;
  threshold: number;
  inStock: number;
  capacity: number;
  unit: string;
}

export type AdminUserStatus = "Active" | "Disabled";
export type AdminUserRole = "Customer" | "VIP";

/** "user" is a customer account (with a tier); "admin" can sign in to the admin panel. */
export type AdminAccountRole = "user" | "admin";

export interface AdminUser {
  id: string;
  accountRole: AdminAccountRole;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  contactNumber: string;
  // Profile photo the customer uploaded (Cloudinary), or null.
  avatarUrl: string | null;
  status: AdminUserStatus;
  /** Customer tier; always "Customer" for admins. */
  role: AdminUserRole;
}

/** A new account made by an admin, who sets its starting password. */
export interface NewAdminUser {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  password: string;
  accountRole: AdminAccountRole;
  role: AdminUserRole;
}

export interface AdminProduct {
  id: string;
  categoryId: string;
  categoryTitle: string;
  name: string;
  description: string;
  pricePhp: number;
  /** Bouquets left to sell; orders take from it, cancellations return it. */
  stock: number;
  /** Public-folder path (seeded products) or Cloudinary URL (uploaded); display via resolveImagePath(). */
  imagePath: string;
  bestSeller: boolean;
  active: boolean;
}

export type AdminProductInput = Omit<AdminProduct, "id" | "categoryTitle">;

export type BuilderOptionGroup = "size" | "flower" | "filler" | "palette" | "wrap" | "ribbon";

export interface AdminBuilderOption extends BuilderOption {
  group: BuilderOptionGroup;
  code: string;
  available: boolean;
  isDefault: boolean;
}

/** What the admin can set on a builder option; the API ignores fields that don't apply to the group. */
export interface BuilderOptionInput {
  name?: string;
  description?: string;
  pricePhp?: number;
  colors?: string[];
  colorChoices?: FlowerColor[];
  imageUrl?: string | null;
  available?: boolean;
  isDefault?: boolean;
}

export type BouquetBuilderSettingTab =
  | "Sizes"
  | "Flower Varieties"
  | "Fillers"
  | "Color Palettes"
  | "Wrap Style"
  | "Ribbon Design"
  | "AI Previews";

/** A customizer preview generated by Gemini and cached for one exact selection. */
export interface GeneratedBouquetPreview {
  key: string;
  image: string;
  createdAt: string;
  selection: {
    flowers: Array<{ name: string; quantity: number; color?: string }>;
    fillers: string[];
    palette: string;
    wrap: string;
    ribbon: string;
  };
}
