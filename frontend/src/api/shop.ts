import type {
  Account,
  AdminBuilderOption,
  AdminProduct,
  AdminProductInput,
  AdminDashboard,
  AdminOrder,
  AdminOrderDetail,
  AdminOrderStatus,
  AdminReports,
  AdminUser,
  BouquetSelection,
  BuilderConfig,
  CatalogCollection,
  CatalogListing,
  CustomerOrder,
  CustomerOrderDetail,
  HomeContent,
  InventoryItem,
  OtpPurpose,
  PlacedOrder,
  ProductCategory,
  ProductItem,
  RegisterInput,
  ReportRange,
  ResetPasswordInput,
  SiteContent
} from "../types/shop";
import { resolveImagePath } from "../utils/assets";
import { apiRequest } from "./client";

// The API returns public-folder paths or Cloudinary URLs; resolve them to displayable URLs.
const withAssetImage = <T extends { image: string }>(item: T): T => ({ ...item, image: resolveImagePath(item.image) });

// Storefront

export const fetchSiteContent = () => apiRequest<SiteContent>("/site-content");

export const fetchHome = async (): Promise<HomeContent> => {
  const home = await apiRequest<HomeContent>("/home");
  return {
    ...home,
    occasionCards: home.occasionCards.map(withAssetImage),
    flowerTypeCards: home.flowerTypeCards.map(withAssetImage)
  };
};

export const fetchCategories = () => apiRequest<ProductCategory[]>("/categories");

export const fetchProducts = async (filter: { category: string } | { collection: CatalogCollection }) => {
  const query = new URLSearchParams(filter).toString();
  const products = await apiRequest<ProductItem[]>(`/products?${query}`);
  return products.map(withAssetImage);
};

export const fetchListing = async (route: string): Promise<CatalogListing> => {
  const listing = await apiRequest<CatalogListing>(`/listing?${new URLSearchParams({ route })}`);
  return { ...listing, products: listing.products.map(withAssetImage) };
};

export const fetchBuilder = async (): Promise<BuilderConfig> => {
  const builder = await apiRequest<BuilderConfig>("/builder");
  return { ...builder, previews: builder.previews.map(withAssetImage) };
};

export type OrderItemInput =
  | { productId: string; quantity: number }
  | { custom: BouquetSelection; quantity: number };

export const placeOrder = (input: { pickupAt: string; items: OrderItemInput[] }) =>
  apiRequest<PlacedOrder>("/orders", { method: "POST", body: input });

export const fetchMyOrders = () => apiRequest<CustomerOrder[]>("/orders");

export const fetchMyOrder = async (orderId: string) => {
  const order = await apiRequest<CustomerOrderDetail>(`/orders/${encodeURIComponent(orderId)}`);
  return {
    ...order,
    items: order.items.map((item) => ({ ...item, image: item.image ? resolveImagePath(item.image, 200) : null }))
  };
};

// Auth

interface AuthResponse {
  token: string;
  account: Account;
}

export const loginRequest = (email: string, password: string) =>
  apiRequest<AuthResponse>("/auth/login", { method: "POST", body: { email, password } });

export const registerRequest = (input: RegisterInput) =>
  apiRequest<AuthResponse>("/auth/register", { method: "POST", body: input });

export const requestOtp = (email: string, purpose: OtpPurpose) =>
  apiRequest<{ message: string }>("/auth/otp", { method: "POST", body: { email, purpose } });

export const resetPasswordRequest = (input: ResetPasswordInput) =>
  apiRequest<AuthResponse>("/auth/password/reset", { method: "POST", body: input });

export const fetchMe = async () => (await apiRequest<{ account: Account }>("/auth/me")).account;

export const logoutRequest = () => apiRequest<void>("/auth/logout", { method: "POST" });

// Admin

export const fetchAdminDashboard = () => apiRequest<AdminDashboard>("/admin/dashboard");

export const fetchAdminReports = (range: ReportRange) => apiRequest<AdminReports>(`/admin/reports?range=${range}`);

export const fetchAdminOrders = () => apiRequest<AdminOrder[]>("/admin/orders");

export const fetchAdminOrder = async (orderId: string) => {
  const order = await apiRequest<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(orderId)}`);
  return {
    ...order,
    items: order.items.map((item) => ({ ...item, image: item.image ? resolveImagePath(item.image, 200) : null }))
  };
};

export const updateOrderStatus = (orderId: string, status: AdminOrderStatus) =>
  apiRequest<AdminOrder>(`/admin/orders/${encodeURIComponent(orderId)}`, { method: "PATCH", body: { status } });

export const fetchInventory = () => apiRequest<InventoryItem[]>("/admin/inventory");

export const adjustInventory = (itemId: string, delta: number) =>
  apiRequest<InventoryItem>(`/admin/inventory/${encodeURIComponent(itemId)}/adjust`, { method: "POST", body: { delta } });

export const fetchAdminUsers = () => apiRequest<AdminUser[]>("/admin/users");

export const updateAdminUser = (user: AdminUser) =>
  apiRequest<AdminUser>(`/admin/users/${encodeURIComponent(user.id)}`, { method: "PATCH", body: user });

export const saveSiteContent = (content: SiteContent) =>
  apiRequest<SiteContent>("/admin/site-content", { method: "PUT", body: content });

export const fetchBuilderOptions = () => apiRequest<AdminBuilderOption[]>("/admin/builder-options");

export const setBuilderOptionAvailability = (optionId: string, available: boolean) =>
  apiRequest<AdminBuilderOption>(`/admin/builder-options/${encodeURIComponent(optionId)}`, {
    method: "PATCH",
    body: { available }
  });

export const fetchAdminProducts = () => apiRequest<AdminProduct[]>("/admin/products");

export const createProduct = (input: AdminProductInput) =>
  apiRequest<AdminProduct>("/admin/products", { method: "POST", body: input });

export const updateProduct = (productId: string, input: AdminProductInput) =>
  apiRequest<AdminProduct>(`/admin/products/${encodeURIComponent(productId)}`, { method: "PATCH", body: input });

// Uploads to Cloudinary through the API (the API holds the Cloudinary secret); returns the image URL.
export const uploadProductImage = async (file: File) =>
  (await apiRequest<{ url: string }>("/admin/uploads/product-image", { method: "POST", body: file })).url;
