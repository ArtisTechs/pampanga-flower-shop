import type { AdminOrderStatus } from "../../types/shop";

const adminOrderStatusFilters: Array<"All Orders" | AdminOrderStatus> = [
  "All Orders",
  "Pending",
  "Ready",
  "Completed"
];

interface AdminOrderFiltersProps {
  activeFilter: "All Orders" | AdminOrderStatus;
  onFilterChange: (filter: "All Orders" | AdminOrderStatus) => void;
}

export const AdminOrderFilters = ({ activeFilter, onFilterChange }: AdminOrderFiltersProps) => (
  <div className="admin-order-filters" aria-label="Order status filters">
    {adminOrderStatusFilters.map((filter) => (
      <button
        className={filter === activeFilter ? "active" : ""}
        type="button"
        onClick={() => onFilterChange(filter)}
        key={filter}
      >
        {filter}
      </button>
    ))}
  </div>
);
