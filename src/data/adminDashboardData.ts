import type {
  AdminDashboardStat,
  AdminLowStockFlower,
  AdminRecentOrder
} from "../types/shop";

export const adminDashboardStats: AdminDashboardStat[] = [
  {
    id: "total-orders",
    label: "Total Orders",
    value: "3",
    icon: "bag"
  },
  {
    id: "total-sales",
    label: "Total Sales",
    value: "₱6,720",
    icon: "peso"
  },
  {
    id: "pending-pickups",
    label: "Pending Pickups",
    value: "7",
    icon: "clock"
  },
  {
    id: "low-stock-flowers",
    label: "Low Stock Flowers",
    value: "2",
    icon: "alert"
  }
];

export const adminRecentOrders: AdminRecentOrder[] = [
  {
    id: "ord-1001",
    customerName: "Maria Santos",
    bouquetSize: "Medium",
    pickupSchedule: "Mar 11, 2026, 11:15 AM",
    pricePhp: 720,
    status: "Pending"
  },
  {
    id: "ord-1002",
    customerName: "Juan Dela Cruz",
    bouquetSize: "Large",
    pickupSchedule: "Mar 10, 2026, 9:30 AM",
    pricePhp: 1950,
    status: "Pending"
  },
  {
    id: "ord-1003",
    customerName: "Ralph Manalang",
    bouquetSize: "Small",
    pickupSchedule: "Mar 7, 2026, 8:00 AM",
    pricePhp: 550,
    status: "Completed"
  }
];

export const adminLowStockFlowers: AdminLowStockFlower[] = [
  {
    id: "stock-peonies",
    name: "Peonies",
    threshold: 20,
    currentStock: 15
  },
  {
    id: "stock-sunflowers",
    name: "Sunflowers",
    threshold: 15,
    currentStock: 7
  }
];
