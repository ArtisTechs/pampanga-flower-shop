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

interface PopularFlowerRow extends RowDataPacket {
  id: string;
  name: string;
  orders: number;
}

const ORDER_TOTALS_SQL = `
  SELECT COUNT(*) AS total_orders,
         COALESCE(SUM(total_php), 0) AS total_sales,
         COALESCE(SUM(status IN ('Pending', 'Ready')), 0) AS pending_pickups
  FROM orders`;

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

adminDashboardRouter.get("/reports", async (_req, res) => {
  const [[[totals]], [popularFlowers]] = await Promise.all([
    pool.query<OrderTotalsRow[]>(ORDER_TOTALS_SQL),
    pool.query<PopularFlowerRow[]>(
      `SELECT f.flower_code AS id, f.flower_name AS name, COUNT(DISTINCT oi.order_id) AS orders
       FROM order_item_flowers f
       JOIN order_items oi ON oi.id = f.order_item_id
       GROUP BY f.flower_code, f.flower_name
       ORDER BY orders DESC, name
       LIMIT 5`
    )
  ]);
  const totalOrders = Number(totals.total_orders);
  const totalRevenuePhp = Number(totals.total_sales);

  res.json({
    totalOrders,
    totalRevenuePhp,
    averageOrderPhp: totalOrders > 0 ? Math.round(totalRevenuePhp / totalOrders) : 0,
    popularFlowers: popularFlowers.map((row) => ({ id: row.id, name: row.name, orders: Number(row.orders) }))
  });
});
