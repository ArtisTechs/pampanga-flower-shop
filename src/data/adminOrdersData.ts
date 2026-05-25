import type { AdminOrderManagementItem, AdminOrderStatus } from "../types/shop";

export const adminOrderStatusFilters: Array<"All Orders" | AdminOrderStatus> = [
  "All Orders",
  "Pending",
  "Ready",
  "Completed"
];

export const adminOrders: AdminOrderManagementItem[] = [
  {
    id: "ord-mgmt-1001",
    customerName: "Arvil Lavigne",
    contactNumber: "09917203092",
    bouquetSize: "Small",
    pickupDate: "March 12, 2026, 2:30 PM",
    totalPhp: 720,
    status: "Pending"
  },
  {
    id: "ord-mgmt-1002",
    customerName: "Ralph Diaz",
    contactNumber: "099198111391",
    bouquetSize: "Medium",
    pickupDate: "March 12, 2026, 2:30 PM",
    totalPhp: 1000,
    status: "Completed"
  },
  {
    id: "ord-mgmt-1003",
    customerName: "Liana Paule",
    contactNumber: "09678543321",
    bouquetSize: "Large",
    pickupDate: "March 12, 2026, 2:30 PM",
    totalPhp: 1500,
    status: "Pending"
  },
  {
    id: "ord-mgmt-1004",
    customerName: "Zaid Roque",
    contactNumber: "08768685422",
    bouquetSize: "Extra Large",
    pickupDate: "March 12, 2026, 2:30 PM",
    totalPhp: 2000,
    status: "Ready"
  }
];
