import type { RowDataPacket } from "mysql2";
import { pool } from "./pool.js";

interface OrderItemRow extends RowDataPacket {
  id: number;
  product_name: string;
  unit_price_php: number;
  quantity: number;
  customization: { size: string; palette: string; wrap: string; ribbon: string } | null;
  image_path: string | null;
}

interface OrderItemFlowerRow extends RowDataPacket {
  order_item_id: number;
  flower_name: string;
  quantity: number;
}

// Every item of an order with its bouquet details and flower counts.
export const loadOrderItems = async (orderId: string) => {
  const [items] = await pool.query<OrderItemRow[]>(
    `SELECT oi.id, oi.product_name, oi.unit_price_php, oi.quantity, oi.customization, p.image_path
     FROM order_items oi
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?
     ORDER BY oi.id`,
    [orderId]
  );
  const [flowers] = items.length > 0
    ? await pool.query<OrderItemFlowerRow[]>(
        "SELECT order_item_id, flower_name, quantity FROM order_item_flowers WHERE order_item_id IN (?) ORDER BY flower_name",
        [items.map((item) => item.id)]
      )
    : [[] as OrderItemFlowerRow[]];

  return items.map((item) => ({
    id: item.id,
    name: item.product_name,
    unitPricePhp: item.unit_price_php,
    quantity: item.quantity,
    image: item.image_path,
    customization: item.customization,
    flowers: flowers
      .filter((flower) => flower.order_item_id === item.id)
      .map((flower) => ({ name: flower.flower_name, quantity: flower.quantity }))
  }));
};
