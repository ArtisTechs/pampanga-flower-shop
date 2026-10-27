import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { errorMessage } from "../api/client";
import { cancelAdminOrder, fetchAdminOrders, reviewOrderPayment, updateOrderStatus } from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminOrderDetailsDialog } from "../components/admin/AdminOrderDetailsDialog";
import { AdminOrdersTable, ORDER_STATUSES } from "../components/admin/AdminOrdersTable";
import { AdminPageHeader, AdminSegments, AdminUiIcon } from "../components/admin/AdminUi";
import { useApiData } from "../hooks/useApiData";
import type { Account, AdminOrder, AdminOrderStatus } from "../types/shop";

type OrderFilter = "All" | "To verify" | AdminOrderStatus;
const ORDER_FILTERS: readonly OrderFilter[] = ["All", "To verify", ...ORDER_STATUSES];

interface AdminOrdersPageProps {
  account: Account;
  onLogout: () => void;
  onToast: (message: string, tone: ToastTone) => void;
}

export const AdminOrdersPage = ({ account, onLogout, onToast }: AdminOrdersPageProps) => {
  const [searchParams] = useSearchParams();
  // ?status=Pending or ?status=To verify (e.g. from the dashboard) preselects a tab.
  const initialFilter = ORDER_FILTERS.find((filter) => filter === searchParams.get("status")) ?? "All";
  const [activeFilter, setActiveFilter] = useState<OrderFilter>(initialFilter);
  const [search, setSearch] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const orders = useApiData(fetchAdminOrders, []);
  const allOrders = useMemo(() => orders.data ?? [], [orders.data]);
  const viewingOrder = allOrders.find((order) => order.id === viewingOrderId) ?? null;

  const counts = useMemo(() => {
    const result: Record<OrderFilter, number> = {
      All: allOrders.length, "To verify": 0, Pending: 0, Ready: 0, Completed: 0, Cancelled: 0
    };
    allOrders.forEach((order) => {
      result[order.status] += 1;
      if (order.paymentStatus === "For verification") {
        result["To verify"] += 1;
      }
    });
    return result;
  }, [allOrders]);

  const visibleOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return allOrders.filter((order) =>
      (activeFilter === "All"
        || order.status === activeFilter
        || (activeFilter === "To verify" && order.paymentStatus === "For verification"))
      && (normalizedSearch === ""
        || order.customerName.toLowerCase().includes(normalizedSearch)
        || order.contactNumber.replace(/\s+/g, "").includes(normalizedSearch.replace(/\s+/g, "")))
    );
  }, [activeFilter, allOrders, search]);

  const replaceOrder = (updatedOrder: AdminOrder) =>
    orders.updateData((current) => current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));

  const handlePaymentReview = async (orderId: string, decision: "Verified" | "Rejected", note?: string) => {
    setUpdatingOrderId(orderId);
    try {
      const updatedOrder = await reviewOrderPayment(orderId, decision, note);
      replaceOrder(updatedOrder);
      onToast(
        decision === "Verified"
          ? `${updatedOrder.customerName}'s payment is verified. You can now prepare the order.`
          : `${updatedOrder.customerName}'s payment was rejected and the order cancelled. Its stock was returned.`,
        "success"
      );
      return true;
    } catch (error) {
      onToast(errorMessage(error), "error");
      return false;
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCancel = async (orderId: string, reason: string) => {
    setUpdatingOrderId(orderId);
    try {
      const updatedOrder = await cancelAdminOrder(orderId, reason || undefined);
      replaceOrder(updatedOrder);
      onToast(`${updatedOrder.customerName}'s order was cancelled and its stock returned.`, "success");
      return true;
    } catch (error) {
      onToast(errorMessage(error), "error");
      return false;
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleStatusChange = async (orderId: string, status: AdminOrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const updatedOrder = await updateOrderStatus(orderId, status);
      replaceOrder(updatedOrder);
      onToast(`${updatedOrder.customerName}'s order is now ${status}.`, "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-products-page">
        <AdminPageHeader
          title="Orders"
          subtitle={orders.data
            ? `${counts.All} orders · ${counts["To verify"]} payments to verify · ${counts.Pending + counts.Ready} waiting for pick-up`
            : "Track pick-ups and update order status"}
        />

        <section className="admin-products-toolbar admin-ui-toolbar-2" aria-label="Filter orders">
          <label className="admin-products-search">
            <AdminUiIcon name="search" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer or phone..."
              aria-label="Search orders by customer name or phone"
            />
          </label>
          <AdminSegments
            label="Filter by status"
            options={ORDER_FILTERS}
            value={activeFilter}
            onChange={setActiveFilter}
            counts={orders.data ? counts : undefined}
          />
        </section>

        {!orders.data ? (
          <LoadState error={orders.error} onRetry={orders.reload} />
        ) : visibleOrders.length === 0 ? (
          <div className="admin-products-empty" role="status">
            <h2>No orders found</h2>
            <p>{search || activeFilter !== "All" ? "Try a different search or status." : "New orders will appear here."}</p>
          </div>
        ) : (
          <AdminOrdersTable
            orders={visibleOrders}
            updatingOrderId={updatingOrderId}
            onStatusChange={handleStatusChange}
            onView={(order) => setViewingOrderId(order.id)}
          />
        )}
      </div>

      {viewingOrder ? (
        <AdminOrderDetailsDialog
          order={viewingOrder}
          isUpdating={updatingOrderId === viewingOrder.id}
          onStatusChange={handleStatusChange}
          onCancel={handleCancel}
          onPaymentReview={handlePaymentReview}
          onClose={() => setViewingOrderId(null)}
        />
      ) : null}
    </AdminLayout>
  );
};
