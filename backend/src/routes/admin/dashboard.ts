import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { ORDER_SELECT, toAdminOrder, type OrderRow } from "./orders.js";

interface OrderTotalsRow extends RowDataPacket {
  total_orders: number;
  total_sales: number;
  pending_pickups: number;
}

interface LowStockRow extends RowDataPacket {
  id: string;
  name: string;
  threshold: number;
  current_stock: number;
}

const ORDER_TOTALS_SQL = `
  SELECT COUNT(*) AS total_orders,
         COALESCE(SUM(total_php), 0) AS total_sales,
         COALESCE(SUM(status IN ('Pending', 'Ready')), 0) AS pending_pickups
  FROM orders
  WHERE status <> 'Cancelled'`;

export const adminDashboardRouter = Router();

adminDashboardRouter.get("/dashboard", async (_req, res) => {
  const [[[totals]], [lowStock], [recentOrders]] = await Promise.all([
    pool.query<OrderTotalsRow[]>(ORDER_TOTALS_SQL),
    pool.query<LowStockRow[]>(
      `SELECT id, name, threshold, current_stock FROM inventory_items
       WHERE kind = 'flower' AND current_stock <= threshold
       ORDER BY current_stock, name`
    ),
    pool.query<OrderRow[]>(`${ORDER_SELECT} ORDER BY created_at DESC LIMIT 5`)
  ]);

  res.json({
    totalOrders: Number(totals.total_orders),
    totalSalesPhp: Number(totals.total_sales),
    pendingPickups: Number(totals.pending_pickups),
    lowStock: lowStock.map((row) => ({
      id: row.id,
      name: row.name,
      threshold: row.threshold,
      currentStock: row.current_stock
    })),
    recentOrders: recentOrders.map(toAdminOrder)
  });
});
