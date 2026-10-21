import { useMemo, useState } from "react";
import { errorMessage } from "../api/client";
import { fetchAdminOrders, updateOrderStatus } from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminOrderFilters } from "../components/admin/AdminOrderFilters";
import { AdminOrdersTable } from "../components/admin/AdminOrdersTable";
import { useApiData } from "../hooks/useApiData";
import type { Account, AdminOrderStatus } from "../types/shop";

interface AdminOrdersPageProps {
  account: Account;
  onLogout: () => void;
  onToast: (message: string, tone: ToastTone) => void;
}

export const AdminOrdersPage = ({ account, onLogout, onToast }: AdminOrdersPageProps) => {
  const [activeFilter, setActiveFilter] = useState<"All Orders" | AdminOrderStatus>("All Orders");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const orders = useApiData(fetchAdminOrders, []);
  const visibleOrders = useMemo(
    () => {
      const allOrders = orders.data ?? [];
      return activeFilter === "All Orders"
        ? allOrders
        : allOrders.filter((order) => order.status === activeFilter);
    },
    [activeFilter, orders.data]
  );

  const handleStatusChange = async (orderId: string, status: AdminOrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const updatedOrder = await updateOrderStatus(orderId, status);
      orders.updateData((current) => current.map((order) => (order.id === orderId ? updatedOrder : order)));
      onToast(`Order for ${updatedOrder.customerName} marked ${status}.`, "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-orders-page">
        <h1>Orders Management</h1>
        <AdminOrderFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        {orders.data ? (
          <AdminOrdersTable
            orders={visibleOrders}
            updatingOrderId={updatingOrderId}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <LoadState error={orders.error} onRetry={orders.reload} />
        )}
      </div>
    </AdminLayout>
  );
};
