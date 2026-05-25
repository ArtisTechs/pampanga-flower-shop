import { useMemo, useState } from "react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminOrderFilters } from "../components/admin/AdminOrderFilters";
import { AdminOrdersTable } from "../components/admin/AdminOrdersTable";
import { adminOrders } from "../data/adminOrdersData";
import type { AdminOrderStatus, MockAccount } from "../types/shop";

interface AdminOrdersPageProps {
  account: MockAccount;
  onLogout: () => void;
}

export const AdminOrdersPage = ({ account, onLogout }: AdminOrdersPageProps) => {
  const [activeFilter, setActiveFilter] = useState<"All Orders" | AdminOrderStatus>("All Orders");
  const visibleOrders = useMemo(
    () => activeFilter === "All Orders"
      ? adminOrders
      : adminOrders.filter((order) => order.status === activeFilter),
    [activeFilter]
  );

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-orders-page">
        <h1>Orders Management</h1>
        <AdminOrderFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        <AdminOrdersTable orders={visibleOrders} />
      </div>
    </AdminLayout>
  );
};
