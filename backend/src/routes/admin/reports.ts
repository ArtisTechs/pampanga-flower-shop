import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { requireOneOf } from "../../utils/validate.js";

// All report dates are the order's placed date (created_at, stored UTC) bucketed in Philippine time.
const SHOP_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const LOCAL_DATE_SQL = "DATE(CONVERT_TZ(o.created_at, '+00:00', '+08:00'))";
const BUCKET_SQL = {
  day: `DATE_FORMAT(${LOCAL_DATE_SQL}, '%Y-%m-%d')`,
  week: `DATE_FORMAT(${LOCAL_DATE_SQL} - INTERVAL WEEKDAY(${LOCAL_DATE_SQL}) DAY, '%Y-%m-%d')`,
  month: `DATE_FORMAT(${LOCAL_DATE_SQL}, '%Y-%m-01')`
} as const;

const RANGES = ["7d", "30d", "90d", "12m", "all"] as const;
type Range = (typeof RANGES)[number];
type Bucket = keyof typeof BUCKET_SQL;

interface TotalsRow extends RowDataPacket {
  orders: number;
  revenue: number | null;
}
interface TimelineRow extends RowDataPacket {
  bucket: string;
  orders: number;
  revenue: number;
}
interface StatusRow extends RowDataPacket {
  status: "Pending" | "Ready" | "Completed" | "Cancelled";
  orders: number;
}
interface TopItemRow extends RowDataPacket {
  name: string;
  quantity: number;
  revenue: number;
}
interface FlowerRow extends RowDataPacket {
  id: string;
  name: string;
  stems: number;
  orders: number;
}
interface FirstOrderRow extends RowDataPacket {
  first_order: Date | null;
}

// Shop-local calendar date (YYYY-MM-DD) for a UTC instant, and the UTC instant of a local midnight.
const localDateKey = (instant: number) => new Date(instant + SHOP_UTC_OFFSET_MS).toISOString().slice(0, 10);
const localMidnightUtc = (dateKey: string) => Date.parse(`${dateKey}T00:00:00Z`) - SHOP_UTC_OFFSET_MS;

const addToKey = (dateKey: string, bucket: Bucket) => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (bucket === "day") date.setUTCDate(date.getUTCDate() + 1);
  if (bucket === "week") date.setUTCDate(date.getUTCDate() + 7);
  if (bucket === "month") date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
};

const bucketStartKey = (dateKey: string, bucket: Bucket) => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (bucket === "week") date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  if (bucket === "month") date.setUTCDate(1);
  return date.toISOString().slice(0, 10);
};

// Range start (UTC instant) and bucket size; "all" starts at the first order.
const resolveRange = async (range: Range, now: number) => {
  const todayKey = localDateKey(now);
  if (range === "all") {
    const [[row]] = await pool.query<FirstOrderRow[]>("SELECT MIN(created_at) AS first_order FROM orders");
    const fromKey = row.first_order ? localDateKey(row.first_order.getTime()) : todayKey;
    const spanDays = (localMidnightUtc(todayKey) - localMidnightUtc(fromKey)) / DAY_MS + 1;
    const bucket: Bucket = spanDays <= 31 ? "day" : spanDays <= 120 ? "week" : "month";
    return { from: localMidnightUtc(bucketStartKey(fromKey, bucket)), bucket, hasPrevious: false };
  }
  if (range === "12m") {
    const first = new Date(`${todayKey}T00:00:00Z`);
    first.setUTCDate(1);
    first.setUTCMonth(first.getUTCMonth() - 11);
    return { from: localMidnightUtc(first.toISOString().slice(0, 10)), bucket: "month" as Bucket, hasPrevious: true };
  }
  const days = { "7d": 7, "30d": 30, "90d": 90 }[range];
  const fromKey = localDateKey(localMidnightUtc(todayKey) - (days - 1) * DAY_MS);
  return { from: localMidnightUtc(fromKey), bucket: (range === "90d" ? "week" : "day") as Bucket, hasPrevious: true };
};

const queryTotals = async (from: Date, to: Date) => {
  const [[row]] = await pool.query<TotalsRow[]>(
    "SELECT COUNT(*) AS orders, SUM(o.total_php) AS revenue FROM orders o WHERE o.status <> 'Cancelled' AND o.created_at >= ? AND o.created_at < ?",
    [from, to]
  );
  return { orders: Number(row.orders), revenuePhp: Number(row.revenue ?? 0) };
};

export const adminReportsRouter = Router();

// GET /admin/reports?range=7d|30d|90d|12m|all (default 30d)
adminReportsRouter.get("/reports", async (req, res) => {
  const range = req.query.range === undefined ? "30d" : requireOneOf(req.query.range, "range", RANGES);
  const now = Date.now();
  const { from: fromMs, bucket, hasPrevious } = await resolveRange(range, now);
  const from = new Date(fromMs);
  const to = new Date(now + 1000);
  const window = [from, to];

  const [totals, previous, [timelineRows], [statusRows], [customRows], [topItemRows], [flowerRows]] = await Promise.all([
    queryTotals(from, to),
    hasPrevious ? queryTotals(new Date(fromMs - (now - fromMs)), from) : Promise.resolve(null),
    pool.query<TimelineRow[]>(
      `SELECT ${BUCKET_SQL[bucket]} AS bucket, COUNT(*) AS orders, SUM(o.total_php) AS revenue
       FROM orders o WHERE o.status <> 'Cancelled' AND o.created_at >= ? AND o.created_at < ?
       GROUP BY bucket ORDER BY bucket`,
      window
    ),
    pool.query<StatusRow[]>(
      "SELECT o.status, COUNT(*) AS orders FROM orders o WHERE o.created_at >= ? AND o.created_at < ? GROUP BY o.status",
      window
    ),
    pool.query<TotalsRow[]>(
      `SELECT COUNT(*) AS orders, SUM(oi.unit_price_php * oi.quantity) AS revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE oi.customization IS NOT NULL AND o.status <> 'Cancelled' AND o.created_at >= ? AND o.created_at < ?`,
      window
    ),
    pool.query<TopItemRow[]>(
      `SELECT CASE WHEN oi.customization IS NULL THEN oi.product_name
                   ELSE CONCAT('Custom bouquet · ', JSON_UNQUOTE(JSON_EXTRACT(oi.customization, '$.size'))) END AS name,
              SUM(oi.quantity) AS quantity, SUM(oi.unit_price_php * oi.quantity) AS revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status <> 'Cancelled' AND o.created_at >= ? AND o.created_at < ?
       GROUP BY name ORDER BY revenue DESC, name LIMIT 5`,
      window
    ),
    pool.query<FlowerRow[]>(
      `SELECT f.flower_code AS id, f.flower_name AS name, SUM(f.quantity * oi.quantity) AS stems,
              COUNT(DISTINCT oi.order_id) AS orders
       FROM order_item_flowers f
       JOIN order_items oi ON oi.id = f.order_item_id
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status <> 'Cancelled' AND o.created_at >= ? AND o.created_at < ?
       GROUP BY f.flower_code, f.flower_name ORDER BY stems DESC, name LIMIT 6`,
      window
    )
  ]);

  // Every bucket in the range, including empty ones, so gaps in sales show as gaps.
  const byBucket = new Map(timelineRows.map((row) => [row.bucket, row]));
  const timeline = [];
  const lastKey = bucketStartKey(localDateKey(now), bucket);
  for (let key = bucketStartKey(localDateKey(fromMs), bucket); key <= lastKey; key = addToKey(key, bucket)) {
    const row = byBucket.get(key);
    timeline.push({ start: key, orders: Number(row?.orders ?? 0), revenuePhp: Number(row?.revenue ?? 0) });
  }

  const statusCounts = { Pending: 0, Ready: 0, Completed: 0, Cancelled: 0 };
  statusRows.forEach((row) => {
    statusCounts[row.status] = Number(row.orders);
  });
  const customRevenue = Number(customRows[0].revenue ?? 0);

  res.json({
    range,
    from: localDateKey(fromMs),
    to: localDateKey(now),
    bucket,
    totals: {
      ...totals,
      averageOrderPhp: totals.orders > 0 ? Math.round(totals.revenuePhp / totals.orders) : 0,
      customRevenueSharePct: totals.revenuePhp > 0 ? Math.round((customRevenue / totals.revenuePhp) * 100) : 0
    },
    previous,
    timeline,
    statusCounts,
    topItems: topItemRows.map((row) => ({ name: row.name, quantity: Number(row.quantity), revenuePhp: Number(row.revenue) })),
    popularFlowers: flowerRows.map((row) => ({ id: row.id, name: row.name, stems: Number(row.stems), orders: Number(row.orders) }))
  });
});
