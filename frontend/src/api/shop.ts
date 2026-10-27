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
  BuilderOptionGroup,
  BuilderOptionInput,
  CatalogCollection,
  ChangePasswordInput,
  CatalogListing,
  CustomerOrder,
  CustomerOrderDetail,
  GeneratedBouquetPreview,
  HomeContent,
  InventoryItem,
  NewAdminUser,
  OtpPurpose,
  PaymentMethod,
  PaymentMethodInput,
  PlacedOrder,
  ProductCategory,
  ProductItem,
  ProfileInput,
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

// The preview for this exact selection; the API generates it only if it isn't cached yet.
export const fetchBouquetPreview = async (selection: BouquetSelection) =>
  resolveImagePath(
    (await apiRequest<{ image: string; generated: boolean }>("/builder/preview", { method: "POST", body: selection })).image
  );

export type OrderItemInput =
  | { productId: string; quantity: number }
  | { custom: BouquetSelection; quantity: number };

export const fetchPaymentMethods = () => apiRequest<PaymentMethod[]>("/payment-methods");

export const placeOrder = (input: { pickupAt: string; paymentMethodId: string; items: OrderItemInput[] }) =>
  apiRequest<PlacedOrder>("/orders", { method: "POST", body: input });

// The payment screenshot (JPG, PNG, or WebP, max 3 MB); the shop verifies it before preparing the order.
export const uploadPaymentProof = (orderId: string, file: File) =>
  apiRequest<CustomerOrder>(`/orders/${encodeURIComponent(orderId)}/payment-proof`, { method: "POST", body: file });

export const fetchMyOrders = () => apiRequest<CustomerOrder[]>("/orders");

// Only while the order is still Pending; its stock goes back to the shop.
export const cancelMyOrder = (orderId: string) =>
  apiRequest<CustomerOrder>(`/orders/${encodeURIComponent(orderId)}/cancel`, { method: "POST" });

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

export const updateProfile = async (input: ProfileInput) =>
  (await apiRequest<{ account: Account }>("/account", { method: "PATCH", body: input })).account;

// The file is sent as-is (JPG, PNG, or WebP, max 3 MB) and stored on Cloudinary.
export const uploadAvatar = async (file: File) =>
  (await apiRequest<{ account: Account }>("/account/avatar", { method: "POST", body: file })).account;

export const removeAvatar = async () =>
  (await apiRequest<{ account: Account }>("/account/avatar", { method: "DELETE" })).account;

export const changePassword = (input: ChangePasswordInput) =>
  apiRequest<void>("/account/password", { method: "POST", body: input });

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

// Returns the order's stock; Completed orders can't be cancelled.
export const cancelAdminOrder = (orderId: string, reason?: string) =>
  apiRequest<AdminOrder>(`/admin/orders/${encodeURIComponent(orderId)}/cancel`, { method: "POST", body: { reason } });

export const reviewOrderPayment = (orderId: string, decision: "Verified" | "Rejected", note?: string) =>
  apiRequest<AdminOrder>(`/admin/orders/${encodeURIComponent(orderId)}/payment`, {
    method: "PATCH",
    body: { decision, note }
  });

export const fetchAdminPaymentMethods = () => apiRequest<PaymentMethod[]>("/admin/payment-methods");

export const createPaymentMethod = (input: PaymentMethodInput) =>
  apiRequest<PaymentMethod>("/admin/payment-methods", { method: "POST", body: input });

export const updatePaymentMethod = (methodId: string, input: PaymentMethodInput) =>
  apiRequest<PaymentMethod>(`/admin/payment-methods/${encodeURIComponent(methodId)}`, { method: "PATCH", body: input });

export const deletePaymentMethod = (methodId: string) =>
  apiRequest<void>(`/admin/payment-methods/${encodeURIComponent(methodId)}`, { method: "DELETE" });

export const uploadPaymentQr = async (file: File) =>
  (await apiRequest<{ url: string }>("/admin/uploads/payment-qr", { method: "POST", body: file })).url;

export const fetchInventory = () => apiRequest<InventoryItem[]>("/admin/inventory");

export const adjustInventory = (itemId: string, delta: number) =>
  apiRequest<InventoryItem>(`/admin/inventory/${encodeURIComponent(itemId)}/adjust`, { method: "POST", body: { delta } });

export const fetchAdminUsers = () => apiRequest<AdminUser[]>("/admin/users");

export const createAdminUser = (user: NewAdminUser) =>
  apiRequest<AdminUser>("/admin/users", { method: "POST", body: user });

export const updateAdminUser = (user: AdminUser) =>
  apiRequest<AdminUser>(`/admin/users/${encodeURIComponent(user.id)}`, { method: "PATCH", body: user });

export const saveSiteContent = (content: SiteContent) =>
  apiRequest<SiteContent>("/admin/site-content", { method: "PUT", body: content });

export const fetchBuilderOptions = () => apiRequest<AdminBuilderOption[]>("/admin/builder-options");

export const createBuilderOption = (group: BuilderOptionGroup, input: BuilderOptionInput) =>
  apiRequest<AdminBuilderOption>("/admin/builder-options", { method: "POST", body: { ...input, group } });

export const updateBuilderOption = (optionId: string, changes: BuilderOptionInput) =>
  apiRequest<AdminBuilderOption>(`/admin/builder-options/${encodeURIComponent(optionId)}`, {
    method: "PATCH",
    body: changes
  });

export const deleteBuilderOption = (optionId: string) =>
  apiRequest<void>(`/admin/builder-options/${encodeURIComponent(optionId)}`, { method: "DELETE" });

// A photo of how a wrap looks (JPG, PNG, or WebP, max 3 MB); returns the image URL.
export const uploadBuilderImage = async (file: File) =>
  (await apiRequest<{ url: string }>("/admin/uploads/builder-image", { method: "POST", body: file })).url;

export const fetchGeneratedPreviews = async () =>
  (await apiRequest<GeneratedBouquetPreview[]>("/admin/builder-previews")).map((preview) => withAssetImage(preview));

export const deleteGeneratedPreview = (key: string) =>
  apiRequest<void>(`/admin/builder-previews/${encodeURIComponent(key)}`, { method: "DELETE" });

export const fetchAdminProducts = () => apiRequest<AdminProduct[]>("/admin/products");

export const createProduct = (input: AdminProductInput) =>
  apiRequest<AdminProduct>("/admin/products", { method: "POST", body: input });

export const updateProduct = (productId: string, input: AdminProductInput) =>
  apiRequest<AdminProduct>(`/admin/products/${encodeURIComponent(productId)}`, { method: "PATCH", body: input });

// Uploads to Cloudinary through the API (the API holds the Cloudinary secret); returns the image URL.
export const uploadProductImage = async (file: File) =>
  (await apiRequest<{ url: string }>("/admin/uploads/product-image", { method: "POST", body: file })).url;
