import { useMemo, useState } from "react";
import { AdminLayout } from "../components/admin/AdminLayout";
import type { MockAccount } from "../types/shop";

type InventoryTab = "Add-Ons" | "Flower Inventory";
type StockFilter = "All" | "Low Stock" | "Healthy";
type StockDelta = -20 | -10 | 10 | 20;

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  threshold: number;
  inStock: number;
  capacity: number;
  unit: string;
}

const flowerInventorySeed: InventoryItem[] = [
  { id: "rose", name: "Roses", description: "Classic and romantic flowers that symbolize love and elegance.", threshold: 20, inStock: 80, capacity: 100, unit: "stems" },
  { id: "tulip", name: "Tulips", description: "Simple and graceful blooms that represent happiness and fresh beginnings.", threshold: 20, inStock: 64, capacity: 100, unit: "stems" },
  { id: "sunflower", name: "Sunflowers", description: "Bright and cheerful flowers that bring warmth and positivity.", threshold: 30, inStock: 42, capacity: 100, unit: "stems" },
  { id: "daisy", name: "Daisies", description: "Light and charming blooms that symbolize innocence and joy.", threshold: 20, inStock: 28, capacity: 100, unit: "stems" },
  { id: "peony", name: "Peonies", description: "Soft and luxurious flowers known for their full petals and timeless beauty.", threshold: 20, inStock: 16, capacity: 100, unit: "stems" }
];

const addOnInventorySeed: InventoryItem[] = [
  { id: "kraft-wrap", name: "Kraft Wrap", description: "Rustic kraft wrapping sheets for natural bouquet styling.", threshold: 15, inStock: 54, capacity: 80, unit: "sheets" },
  { id: "mesh-wrap", name: "Mesh Wrap", description: "Textured mesh wraps for layered presentation.", threshold: 10, inStock: 12, capacity: 60, unit: "sheets" },
  { id: "satin-ribbon", name: "Satin Ribbon", description: "Smooth satin ribbon rolls used for elegant finishing.", threshold: 8, inStock: 18, capacity: 40, unit: "rolls" },
  { id: "gift-card", name: "Gift Cards", description: "Printed mini message cards included with custom bouquets.", threshold: 20, inStock: 120, capacity: 150, unit: "pieces" }
];

interface AdminInventoryPageProps {
  account: MockAccount;
  onLogout: () => void;
}

export const AdminInventoryPage = ({ account, onLogout }: AdminInventoryPageProps) => {
  const [activeTab, setActiveTab] = useState<InventoryTab>("Flower Inventory");
  const [stockFilter, setStockFilter] = useState<StockFilter>("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "stock-asc" | "stock-desc">("name");
  const [flowerInventory, setFlowerInventory] = useState(flowerInventorySeed);
  const [addOnInventory, setAddOnInventory] = useState(addOnInventorySeed);
  const [deltasByItem, setDeltasByItem] = useState<Record<string, StockDelta>>({});

  const activeInventory = activeTab === "Flower Inventory" ? flowerInventory : addOnInventory;

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

  const handleUpdateItemStock = (itemId: string) => {
    const delta = deltasByItem[itemId] ?? 10;

    const applyUpdate = (items: InventoryItem[]) =>
      items.map((item) =>
        item.id === itemId
          ? { ...item, inStock: Math.max(0, Math.min(item.capacity, item.inStock + delta)) }
          : item
      );

    if (activeTab === "Flower Inventory") {
      setFlowerInventory((currentItems) => applyUpdate(currentItems));
    } else {
      setAddOnInventory((currentItems) => applyUpdate(currentItems));
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
                      <button type="button" onClick={() => handleUpdateItemStock(item.id)}>Update</button>
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
