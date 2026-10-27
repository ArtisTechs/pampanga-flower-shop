import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { errorMessage } from "../api/client";
import { adjustInventory, fetchInventory } from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminPageHeader, AdminSegments, AdminUiIcon } from "../components/admin/AdminUi";
import { useApiData } from "../hooks/useApiData";
import type { Account, InventoryItem } from "../types/shop";

type InventoryTab = "Flowers" | "Add-ons" | "Bouquets";
type StockFilter = "all" | "low" | "healthy";
type SortBy = "name" | "stock-asc" | "stock-desc";

const INVENTORY_TABS = ["Flowers", "Add-ons", "Bouquets"] as const;
const tabKinds: Record<InventoryTab, InventoryItem["kind"]> = { Flowers: "flower", "Add-ons": "add-on", Bouquets: "product" };
const isLowStock = (item: InventoryItem) => item.inStock <= item.threshold;
// Product ids and supply ids are separate, so rows are keyed by both.
const itemKey = (item: InventoryItem) => `${item.kind}:${item.id}`;
// Bouquets have no storage limit; supplies stop at their capacity.
const isFull = (item: InventoryItem) => item.kind !== "product" && item.inStock >= item.capacity;

interface AdminInventoryPageProps {
  account: Account;
  onLogout: () => void;
  onToast: (message: string, tone: ToastTone) => void;
}

export const AdminInventoryPage = ({ account, onLogout, onToast }: AdminInventoryPageProps) => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<InventoryTab>("Flowers");
  // ?stock=low (from the dashboard) opens the low-stock view.
  const [stockFilter, setStockFilter] = useState<StockFilter>(searchParams.get("stock") === "low" ? "low" : "all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const inventory = useApiData(fetchInventory, []);
  const allItems = useMemo(() => inventory.data ?? [], [inventory.data]);

  const tabCounts = {
    Flowers: allItems.filter((item) => item.kind === "flower").length,
    "Add-ons": allItems.filter((item) => item.kind === "add-on").length,
    Bouquets: allItems.filter((item) => item.kind === "product").length
  };
  const lowCount = allItems.filter(isLowStock).length;

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = allItems.filter((item) =>
      item.kind === tabKinds[activeTab]
      && (normalizedSearch === ""
        || item.name.toLowerCase().includes(normalizedSearch)
        || item.description.toLowerCase().includes(normalizedSearch))
      && (stockFilter === "all" || (stockFilter === "low") === isLowStock(item))
    );
    const sorters: Record<SortBy, (first: InventoryItem, second: InventoryItem) => number> = {
      name: (first, second) => first.name.localeCompare(second.name),
      "stock-asc": (first, second) => first.inStock - second.inStock,
      "stock-desc": (first, second) => second.inStock - first.inStock
    };
    return [...filtered].sort(sorters[sortBy]);
  }, [activeTab, allItems, search, sortBy, stockFilter]);

  const handleAdjust = async (item: InventoryItem, direction: 1 | -1) => {
    const amount = Number(amounts[itemKey(item)] ?? "10");
    if (!Number.isInteger(amount) || amount <= 0) {
      onToast("Enter a whole number above 0.", "error");
      return;
    }

    setUpdatingItemId(itemKey(item));
    try {
      const updatedItem = await adjustInventory(item, amount * direction);
      inventory.updateData((current) => current.map((entry) => (itemKey(entry) === itemKey(item) ? updatedItem : entry)));
      const capped = direction === 1 && item.kind !== "product"
        && updatedItem.inStock === updatedItem.capacity && item.inStock + amount > item.capacity;
      onToast(
        `${updatedItem.name}: ${updatedItem.inStock} ${updatedItem.unit} in stock${capped ? " (storage is full)" : ""}.`,
        "success"
      );
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setUpdatingItemId(null);
    }
  };

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-products-page">
        <AdminPageHeader
          title="Inventory"
          subtitle={inventory.data
            ? `${tabCounts.Flowers} flowers · ${tabCounts["Add-ons"]} add-ons · ${tabCounts.Bouquets} bouquets · ${lowCount === 0 ? "everything is stocked" : `${lowCount} need restocking`}`
            : "Track flower stems, add-on supplies and ready-made bouquets"}
        />

        <section className="admin-products-toolbar admin-ui-toolbar-inventory" aria-label="Filter inventory">
          <AdminSegments
            label="Inventory type"
            options={INVENTORY_TABS}
            value={activeTab}
            onChange={setActiveTab}
            counts={inventory.data ? tabCounts : undefined}
          />
          <label className="admin-products-search">
            <AdminUiIcon name="search" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              aria-label={`Search ${activeTab}`}
            />
          </label>
          <select className="admin-products-select" value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockFilter)} aria-label="Filter by stock level">
            <option value="all">All stock levels</option>
            <option value="low">Low stock only</option>
            <option value="healthy">Healthy only</option>
          </select>
          <select className="admin-products-select" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortBy)} aria-label="Sort inventory">
            <option value="name">Sort: Name</option>
            <option value="stock-asc">Sort: Lowest stock</option>
            <option value="stock-desc">Sort: Highest stock</option>
          </select>
        </section>

        {!inventory.data ? (
          <LoadState error={inventory.error} onRetry={inventory.reload} />
        ) : visibleItems.length === 0 ? (
          <div className="admin-products-empty" role="status">
            <h2>{stockFilter === "low" ? "Nothing needs restocking" : "No items found"}</h2>
            <p>{stockFilter === "low" ? "Every item is above its restock level." : "Try a different search or filter."}</p>
          </div>
        ) : (
          <ul className="admin-ui-panel admin-ui-inventory-list" aria-label={`${activeTab} stock`}>
            {visibleItems.map((item) => {
              const low = isLowStock(item);
              const fillPercent = Math.max(0, Math.min(100, (item.inStock / item.capacity) * 100));
              const isUpdating = updatingItemId === itemKey(item);

              return (
                <li key={itemKey(item)} className={low ? "is-low" : ""}>
                  <div className="admin-ui-inventory-info">
                    <h3>
                      {item.name}
                      {low ? <span className="admin-ui-badge status-low">Low stock</span> : null}
                    </h3>
                    <p className="admin-ui-muted">{item.description}</p>
                  </div>
                  <div className="admin-ui-inventory-level">
                    <div className="admin-ui-level-text">
                      {item.kind === "product"
                        ? <><strong>{item.inStock}</strong> {item.unit}</>
                        : <><strong>{item.inStock}</strong> / {item.capacity} {item.unit}</>}
                      <span className="admin-ui-muted">Restock at {item.threshold}</span>
                    </div>
                    <div className="admin-ui-level-bar" role="meter" aria-valuemin={0} aria-valuemax={item.capacity} aria-valuenow={item.inStock} aria-label={`${item.name} stock level`}>
                      <span style={{ width: `${fillPercent}%` }} />
                      <i style={{ left: `${Math.min(100, (item.threshold / item.capacity) * 100)}%` }} aria-hidden="true" />
                    </div>
                  </div>
                  <div className="admin-ui-adjust">
                    <button
                      type="button"
                      onClick={() => handleAdjust(item, -1)}
                      disabled={isUpdating || item.inStock === 0}
                      aria-label={`Remove stock from ${item.name}`}
                    >
                      <AdminUiIcon name="minus" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={amounts[itemKey(item)] ?? "10"}
                      onChange={(event) => setAmounts((current) => ({ ...current, [itemKey(item)]: event.target.value }))}
                      aria-label={`Amount to adjust for ${item.name}`}
                    />
                    <button
                      type="button"
                      className="add"
                      onClick={() => handleAdjust(item, 1)}
                      disabled={isUpdating || isFull(item)}
                      aria-label={`Add stock to ${item.name}`}
                    >
                      <AdminUiIcon name="plus" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
};
