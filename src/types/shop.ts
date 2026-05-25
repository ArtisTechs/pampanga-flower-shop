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

export interface ReviewCard {
  id: string;
  name: string;
  summary: string;
  bullets: string[];
  actionText: string;
  popular?: boolean;
}

export interface ProductItem {
  id: string;
  name: string;
  pricePhp: number;
  image: string;
  bestSeller?: boolean;
  catalogFilters?: Array<"best-sellers" | "occasions" | "flowers">;
}

export interface ProductCategory {
  id: string;
  title: string;
  route: string;
  products: ProductItem[];
  collectionType?: "best-sellers" | "occasions" | "flowers";
}

export interface CartItem extends ProductItem {
  quantity: number;
}

export type AccountRole = "user" | "admin";

export interface MockAccount {
  id: string;
  role: AccountRole;
  fullName: string;
  email: string;
  password: string;
  contactNumber: string;
  avatarInitials: string;
}

export interface AdminDashboardStat {
  id: string;
  label: string;
  value: string;
  icon: "bag" | "peso" | "clock" | "alert";
}

export interface AdminRecentOrder {
  id: string;
  customerName: string;
  bouquetSize: "Small" | "Medium" | "Large";
  pickupSchedule: string;
  pricePhp: number;
  status: "Pending" | "Completed";
}

export interface AdminLowStockFlower {
  id: string;
  name: string;
  threshold: number;
  currentStock: number;
}

export type AdminOrderStatus = "Pending" | "Ready" | "Completed";

export interface AdminOrderManagementItem {
  id: string;
  customerName: string;
  contactNumber: string;
  bouquetSize: "Small" | "Medium" | "Large" | "Extra Large";
  pickupDate: string;
  totalPhp: number;
  status: AdminOrderStatus;
}

export type BouquetBuilderSettingTab =
  | "Sizes"
  | "Flower Varieties"
  | "Color Palettes"
  | "Wrap Style"
  | "Ribbon Design";

export interface BouquetBuilderSettingItem {
  id: string;
  name: string;
  description: string;
  available: boolean;
}
