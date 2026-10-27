import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { errorMessage } from "../api/client";
import { createProduct, fetchAdminProducts, fetchCategories, updateProduct, uploadProductImage } from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminUiIcon as Icon } from "../components/admin/AdminUi";
import { useApiData } from "../hooks/useApiData";
import type { Account, AdminProduct, AdminProductInput, ProductCategory } from "../types/shop";
import { resolveImagePath } from "../utils/assets";
import { formatPhpCurrency } from "../utils/currency";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_DESCRIPTION = 1000;

type StatusFilter = "All" | "Visible" | "Hidden";
const toInput = ({ categoryId, name, description, pricePhp, stock, imagePath, bestSeller, active }: AdminProduct): AdminProductInput => ({
  categoryId,
  name,
  description,
  pricePhp,
  stock,
  imagePath,
  bestSeller,
  active
});

interface AdminProductsPageProps {
  account: Account;
  onLogout: () => void;
  onToast: (message: string, tone: ToastTone) => void;
}

export const AdminProductsPage = ({ account, onLogout, onToast }: AdminProductsPageProps) => {
  const products = useApiData(fetchAdminProducts, []);
  const categories = useApiData(fetchCategories, []);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  // null = closed, "new" = add form, otherwise the product being edited.
  const [editing, setEditing] = useState<AdminProduct | "new" | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const allProducts = useMemo(() => products.data ?? [], [products.data]);
  const statusCounts: Record<StatusFilter, number> = {
    All: allProducts.length,
    Visible: allProducts.filter((product) => product.active).length,
    Hidden: allProducts.filter((product) => !product.active).length
  };

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return allProducts.filter((product) => {
      const matchesSearch = normalizedSearch.length === 0
        || product.name.toLowerCase().includes(normalizedSearch)
        || product.description.toLowerCase().includes(normalizedSearch);
      const matchesCategory = categoryFilter === "All" || product.categoryId === categoryFilter;
      const matchesStatus = statusFilter === "All"
        || (statusFilter === "Visible" && product.active)
        || (statusFilter === "Hidden" && !product.active);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [allProducts, categoryFilter, search, statusFilter]);

  const hasFilters = search.trim() !== "" || categoryFilter !== "All" || statusFilter !== "All";

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("All");
    setStatusFilter("All");
  };

  const handleSaved = (saved: AdminProduct, isNew: boolean) => {
    products.updateData((current) =>
      isNew ? [saved, ...current] : current.map((product) => (product.id === saved.id ? saved : product))
    );
    setEditing(null);
    onToast(`${saved.name} was ${isNew ? "added" : "updated"}.`, "success");
  };

  const handleToggleVisibility = async (product: AdminProduct) => {
    setTogglingId(product.id);
    try {
      const saved = await updateProduct(product.id, { ...toInput(product), active: !product.active });
      products.updateData((current) => current.map((entry) => (entry.id === saved.id ? saved : entry)));
      onToast(`${saved.name} is now ${saved.active ? "visible on" : "hidden from"} the storefront.`, "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setTogglingId(null);
    }
  };

  const isReady = products.data !== null && categories.data !== null;

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-products-page">
        <header className="admin-products-topbar">
          <div>
            <h1>Products</h1>
            <p>
              {isReady
                ? `${statusCounts.All} products · ${statusCounts.Visible} on storefront · ${statusCounts.Hidden} hidden`
                : "Manage the bouquets customers can buy"}
            </p>
          </div>
          <button type="button" className="admin-products-primary" onClick={() => setEditing("new")} disabled={!isReady}>
            <Icon name="plus" />
            Add product
          </button>
        </header>

        <section className="admin-products-toolbar" aria-label="Filter products">
          <label className="admin-products-search">
            <Icon name="search" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
              aria-label="Search products by name or description"
            />
          </label>
          <select
            className="admin-products-select"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="All">All categories</option>
            {(categories.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>{category.title}</option>
            ))}
          </select>
          <div className="admin-products-segments" role="group" aria-label="Filter by visibility">
            {(["All", "Visible", "Hidden"] as const).map((status) => (
              <button
                key={status}
                type="button"
                className={status === statusFilter ? "active" : ""}
                aria-pressed={status === statusFilter}
                onClick={() => setStatusFilter(status)}
              >
                {status}
                {isReady ? <span>{statusCounts[status]}</span> : null}
              </button>
            ))}
          </div>
        </section>

        {!isReady ? (
          <LoadState
            error={products.error ?? categories.error}
            onRetry={() => {
              products.reload();
              categories.reload();
            }}
          />
        ) : visibleProducts.length === 0 ? (
          <div className="admin-products-empty" role="status">
            <h2>{hasFilters ? "No products match your filters" : "No products yet"}</h2>
            <p>{hasFilters ? "Try a different search or clear the filters." : "Add your first bouquet to start selling."}</p>
            {hasFilters ? (
              <button type="button" className="admin-products-secondary" onClick={clearFilters}>Clear filters</button>
            ) : (
              <button type="button" className="admin-products-primary" onClick={() => setEditing("new")}>
                <Icon name="plus" />
                Add product
              </button>
            )}
          </div>
        ) : (
          <section className="admin-products-grid" aria-label="Products">
            {visibleProducts.map((product) => (
              <article key={product.id} className={`admin-product-card ${product.active ? "" : "is-hidden"}`}>
                <div className="admin-product-media">
                  <img src={resolveImagePath(product.imagePath, 400)} alt="" loading="lazy" />
                  <div className="admin-product-badges">
                    {product.bestSeller ? <span className="admin-product-badge">★ Best seller</span> : null}
                    {product.active ? null : <span className="admin-product-badge muted">Hidden</span>}
                  </div>
                </div>
                <div className="admin-product-card-body">
                  <p className="admin-product-category">{product.categoryTitle}</p>
                  <h3>{product.name}</h3>
                  <strong>{formatPhpCurrency(product.pricePhp)}</strong>
                  <span className={`stock-note ${product.stock <= 0 ? "sold-out" : ""}`}>
                    {product.stock <= 0 ? "Sold out" : `${product.stock} in stock`}
                  </span>
                </div>
                <div className="admin-product-actions">
                  <button type="button" className="edit" onClick={() => setEditing(product)} aria-label={`Edit ${product.name}`}>
                    <Icon name="edit" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(product)}
                    disabled={togglingId === product.id}
                    aria-label={`${product.active ? "Hide" : "Show"} ${product.name} ${product.active ? "from" : "on"} the storefront`}
                  >
                    <Icon name={product.active ? "eye-off" : "eye"} />
                    {product.active ? "Hide" : "Show"}
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      {editing && categories.data ? (
        <ProductFormDialog
          product={editing === "new" ? null : editing}
          categories={categories.data}
          defaultCategoryId={categoryFilter !== "All" ? categoryFilter : categories.data[0]?.id ?? ""}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onToast={onToast}
        />
      ) : null}
    </AdminLayout>
  );
};

interface ProductFormDialogProps {
  product: AdminProduct | null;
  categories: ProductCategory[];
  defaultCategoryId: string;
  onClose: () => void;
  onSaved: (product: AdminProduct, isNew: boolean) => void;
  onToast: (message: string, tone: ToastTone) => void;
}

type FieldErrors = Partial<Record<"image" | "name" | "category" | "price" | "stock", string>>;
const MAX_STOCK = 100_000;

const ProductFormDialog = ({ product, categories, defaultCategoryId, onClose, onSaved, onToast }: ProductFormDialogProps) => {
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? defaultCategoryId);
  const [price, setPrice] = useState(product ? String(product.pricePhp) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [bestSeller, setBestSeller] = useState(product?.bestSeller ?? false);
  const [active, setActive] = useState(product?.active ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const previewUrl = filePreviewUrl ?? (product ? resolveImagePath(product.imagePath, 600) : null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  useEffect(() => {
    if (!imageFile) {
      setFilePreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const pickFile = (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (!IMAGE_TYPES.includes(file.type)) {
      setErrors((current) => ({ ...current, image: "Use a JPG, PNG, or WebP image." }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((current) => ({ ...current, image: `This image is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is 3 MB.` }));
      return;
    }
    setErrors((current) => ({ ...current, image: undefined }));
    setImageFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    pickFile(event.dataTransfer.files[0]);
  };

  const validate = (): FieldErrors => {
    const pricePhp = Number(price);
    return {
      image: !imageFile && !product ? "Add a photo of the bouquet." : undefined,
      name: name.trim() ? undefined : "Enter a product name.",
      category: categoryId ? undefined : "Choose a category.",
      price: price.trim() !== "" && Number.isFinite(pricePhp) && pricePhp > 0 ? undefined : "Enter a price above ₱0.",
      stock: stock.trim() !== "" && Number.isInteger(Number(stock)) && Number(stock) >= 0 && Number(stock) <= MAX_STOCK
        ? undefined
        : "Enter how many bouquets you can sell (0 or more)."
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setIsSaving(true);
    try {
      const imagePath = imageFile ? await uploadProductImage(imageFile) : product!.imagePath;
      const input: AdminProductInput = {
        categoryId,
        name: name.trim(),
        description: description.trim(),
        pricePhp: Number(price),
        stock: Number(stock),
        imagePath,
        bestSeller,
        active
      };
      const saved = product ? await updateProduct(product.id, input) : await createProduct(input);
      onSaved(saved, !product);
    } catch (error) {
      onToast(errorMessage(error), "error");
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-product-dialog-backdrop">
      <form
        className="admin-product-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-product-dialog-title"
        onSubmit={handleSubmit}
        noValidate
      >
        <header className="admin-product-dialog-header">
          <div>
            <h2 id="admin-product-dialog-title">{product ? "Edit product" : "Add product"}</h2>
            <p>{product ? "Changes show on the storefront right after saving." : "Fill in the details customers will see."}</p>
          </div>
          <button type="button" className="admin-product-dialog-close" onClick={onClose} disabled={isSaving} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>

        <div className="admin-product-dialog-body">
          <div className="admin-product-field">
            <span className="admin-product-label">Photo <em>*</em></span>
            <label
              className={`admin-product-dropzone ${isDragging ? "dragging" : ""} ${previewUrl ? "has-image" : ""} ${errors.image ? "invalid" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept={IMAGE_TYPES.join(",")}
                onChange={(event) => pickFile(event.target.files?.[0])}
                disabled={isSaving}
              />
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Product photo preview" />
                  <span className="admin-product-dropzone-overlay">
                    <Icon name="upload" />
                    Change photo
                  </span>
                </>
              ) : (
                <span className="admin-product-dropzone-empty">
                  <Icon name="upload" />
                  <strong>Click to upload</strong>
                  or drag and drop
                  <small>JPG, PNG or WebP · up to 3 MB</small>
                </span>
              )}
            </label>
            {imageFile ? <span className="admin-product-hint">{imageFile.name}</span> : null}
            {errors.image ? <span className="admin-product-error">{errors.image}</span> : null}
          </div>

          <div className="admin-product-fields">
            <label className="admin-product-field">
              <span className="admin-product-label">Product name <em>*</em></span>
              <input
                ref={nameInputRef}
                className={errors.name ? "invalid" : ""}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={160}
                placeholder="e.g. Blushing Peony Bouquet"
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name ? <span className="admin-product-error">{errors.name}</span> : null}
            </label>

            <div className="admin-product-field-row">
              <label className="admin-product-field">
                <span className="admin-product-label">Category <em>*</em></span>
                <select
                  className={errors.category ? "invalid" : ""}
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  aria-invalid={Boolean(errors.category)}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.title}</option>
                  ))}
                </select>
                {errors.category ? <span className="admin-product-error">{errors.category}</span> : null}
              </label>

              <label className="admin-product-field">
                <span className="admin-product-label">Price <em>*</em></span>
                <span className={`admin-product-price ${errors.price ? "invalid" : ""}`}>
                  <span aria-hidden="true">₱</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="0.01"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder="0.00"
                    aria-invalid={Boolean(errors.price)}
                  />
                </span>
                {errors.price ? <span className="admin-product-error">{errors.price}</span> : null}
              </label>

              <label className="admin-product-field">
                <span className="admin-product-label">Stock <em>*</em></span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={MAX_STOCK}
                  step="1"
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
                  placeholder="0"
                  className={errors.stock ? "invalid" : ""}
                  aria-invalid={Boolean(errors.stock)}
                />
                <small className="admin-ui-muted">Bouquets left to sell. Orders take from it; cancelled orders put it back.</small>
                {errors.stock ? <span className="admin-product-error">{errors.stock}</span> : null}
              </label>
            </div>

            <label className="admin-product-field">
              <span className="admin-product-label">
                Description
                <small>{description.length}/{MAX_DESCRIPTION}</small>
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={MAX_DESCRIPTION}
                rows={4}
                placeholder="Flowers, colors, and what makes this bouquet special"
              />
            </label>

            <div className="admin-product-switches">
              <label className="admin-product-switch">
                <input type="checkbox" role="switch" checked={active} onChange={(event) => setActive(event.target.checked)} />
                <span className="admin-product-switch-track" aria-hidden="true" />
                <span>
                  <strong>Visible on storefront</strong>
                  <small>Customers can see and buy it</small>
                </span>
              </label>
              <label className="admin-product-switch">
                <input type="checkbox" role="switch" checked={bestSeller} onChange={(event) => setBestSeller(event.target.checked)} />
                <span className="admin-product-switch-track" aria-hidden="true" />
                <span>
                  <strong>Best seller</strong>
                  <small>Also listed under Best Sellers</small>
                </span>
              </label>
            </div>
          </div>
        </div>

        <footer className="admin-product-dialog-footer">
          <button type="button" className="admin-products-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="submit" className="admin-products-primary" disabled={isSaving}>
            {isSaving ? (imageFile ? "Uploading photo..." : "Saving...") : product ? "Save changes" : "Add product"}
          </button>
        </footer>
      </form>
    </div>
  );
};
