import { useMemo, useState } from "react";
import { errorMessage } from "../api/client";
import { adjustInventory, fetchInventory } from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { useApiData } from "../hooks/useApiData";
import type { Account } from "../types/shop";

type InventoryTab = "Add-Ons" | "Flower Inventory";
type StockFilter = "All" | "Low Stock" | "Healthy";
type StockDelta = -20 | -10 | 10 | 20;


interface AdminInventoryPageProps {
  account: Account;
  onLogout: () => void;
  onToast: (message: string, tone: ToastTone) => void;
}

export const AdminInventoryPage = ({ account, onLogout, onToast }: AdminInventoryPageProps) => {
  const [activeTab, setActiveTab] = useState<InventoryTab>("Flower Inventory");
  const [stockFilter, setStockFilter] = useState<StockFilter>("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "stock-asc" | "stock-desc">("name");
  const [deltasByItem, setDeltasByItem] = useState<Record<string, StockDelta>>({});
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const inventory = useApiData(fetchInventory, []);
  const activeKind = activeTab === "Flower Inventory" ? "flower" : "add-on";
  const activeInventory = useMemo(
    () => (inventory.data ?? []).filter((item) => item.kind === activeKind),
    [activeKind, inventory.data]
  );

  const filteredInventory = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = activeInventory.filter((item) => {
      const matchesSearch = normalizedSearch.length === 0
        || item.name.toLowerCase().includes(normalizedSearch)
        || item.description.toLowerCase().includes(normalizedSearch);
      const isLowStock = item.inStock <= item.threshold;
      const matchesStock = stockFilter === "All"
        || (stockFilter === "Low Stock" && isLowStock)
        || (stockFilter === "Healthy" && !isLowStock);

      return matchesSearch && matchesStock;
    });

    if (sortBy === "stock-asc") {
      return [...filtered].sort((first, second) => first.inStock - second.inStock);
    }

    if (sortBy === "stock-desc") {
      return [...filtered].sort((first, second) => second.inStock - first.inStock);
    }

    return [...filtered].sort((first, second) => first.name.localeCompare(second.name));
  }, [activeInventory, search, sortBy, stockFilter]);

  const handleUpdateItemStock = async (itemId: string) => {
    const delta = deltasByItem[itemId] ?? 10;

    setUpdatingItemId(itemId);
    try {
      const updatedItem = await adjustInventory(itemId, delta);
      inventory.updateData((current) => current.map((item) => (item.id === itemId ? updatedItem : item)));
      onToast(`${updatedItem.name} stock is now ${updatedItem.inStock} ${updatedItem.unit}.`, "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setUpdatingItemId(null);
    }
  };

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-inventory-page">
        <h1>Add-Ons &amp; Inventory</h1>

        <div className="admin-inventory-tabs" role="tablist" aria-label="Inventory sections">
          {(["Add-Ons", "Flower Inventory"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={tab === activeTab ? "active" : ""}
              role="tab"
              aria-selected={tab === activeTab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <section className="admin-inventory-panel" aria-label={`${activeTab} inventory`}>
          <div className="admin-inventory-filters">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              aria-label={`Search ${activeTab}`}
            />
            <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockFilter)} aria-label="Filter by stock status">
              <option value="All">All Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Healthy">Healthy Stock</option>
            </select>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "name" | "stock-asc" | "stock-desc")} aria-label="Sort inventory">
              <option value="name">Sort: Name</option>
              <option value="stock-asc">Sort: Lowest Stock</option>
              <option value="stock-desc">Sort: Highest Stock</option>
            </select>
          </div>

          <div className="admin-inventory-list">
            {!inventory.data ? <LoadState error={inventory.error} onRetry={inventory.reload} /> : null}
            {filteredInventory.map((item) => {
              const isLowStock = item.inStock <= item.threshold;
              const fillPercent = Math.max(0, Math.min(100, (item.inStock / item.capacity) * 100));

              return (
                <article key={item.id} className={`admin-inventory-card ${isLowStock ? "low-stock" : ""}`}>
                  <div className="admin-inventory-card-top">
                    <div>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                    </div>
                    <div className="admin-inventory-meta">
                      <div>
                        <span>Threshold</span>
                        <strong>{item.threshold} {item.unit}</strong>
                      </div>
                      <div>
                        <span>In Stock</span>
                        <strong>{item.inStock}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="admin-inventory-card-bottom">
                    <div className="admin-inventory-progress" aria-label={`${item.name} stock level`}>
                      <span style={{ width: `${fillPercent}%` }} />
                    </div>
                    <span className="admin-inventory-units">{item.capacity} {item.unit}</span>
                    <div className="admin-inventory-actions">
                      <select
                        value={String(deltasByItem[item.id] ?? 10)}
                        onChange={(event) =>
                          setDeltasByItem((current) => ({
                            ...current,
                            [item.id]: Number(event.target.value) as StockDelta
                          }))
                        }
                        aria-label={`Stock adjustment for ${item.name}`}
                      >
                        <option value="-20">-20</option>
                        <option value="-10">-10</option>
                        <option value="10">+10</option>
                        <option value="20">+20</option>
                      </select>
                      <button type="button" onClick={() => handleUpdateItemStock(item.id)} disabled={updatingItemId === item.id}>
                        Update
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};
