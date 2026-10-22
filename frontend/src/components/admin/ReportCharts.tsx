import { useEffect, useRef, useState } from "react";
import type { AdminOrderStatus, AdminReports } from "../../types/shop";
import { formatPhpCurrency } from "../../utils/currency";

// Plain-SVG charts for the Reports page. Colors are CSS custom properties (--rc-*) defined on
// .admin-reports-page in global.css; the status trio was run through the dataviz palette validator.

const compactPeso = (value: number) =>
  value >= 1_000_000 ? `₱${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    : value >= 1_000 ? `₱${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`
      : `₱${Math.round(value)}`;

// 0 → 1, 2, 2.5, 5 × 10^n so axis ticks land on clean numbers.
const niceMax = (value: number) => {
  if (value <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value) ?? 10;
  return step * magnitude;
};

const parseKey = (key: string) => new Date(`${key}T00:00:00Z`);
const shortDate = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("en-PH", { month: "short", year: "numeric", timeZone: "UTC" });
const shortMonth = new Intl.DateTimeFormat("en-PH", { month: "short", timeZone: "UTC" });

export const bucketLabel = (key: string, bucket: AdminReports["bucket"], long = false) => {
  const date = parseKey(key);
  if (bucket === "month") return long ? monthYear.format(date) : shortMonth.format(date);
  if (bucket === "week") return long ? `Week of ${shortDate.format(date)}` : shortDate.format(date);
  return shortDate.format(date);
};

const useElementWidth = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
};

interface RevenueChartProps {
  timeline: AdminReports["timeline"];
  bucket: AdminReports["bucket"];
}

const PLOT_HEIGHT = 220;
const AXIS_BAND = 28;
const LEFT_GUTTER = 52;
const TOP_PAD = 22;

// Single-series column chart: revenue per day/week/month, hover or focus a column for its details.
export const RevenueColumnChart = ({ timeline, bucket }: RevenueChartProps) => {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const maxValue = niceMax(Math.max(...timeline.map((point) => point.revenuePhp)));
  const plotWidth = Math.max(0, width - LEFT_GUTTER - 8);
  const band = timeline.length > 0 ? plotWidth / timeline.length : 0;
  const barWidth = Math.max(2, Math.min(24, band - 2, band * 0.62));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * maxValue);
  const labelEvery = Math.max(1, Math.ceil(timeline.length / Math.max(1, Math.floor(plotWidth / 64))));
  const peakIndex = timeline.reduce((best, point, index) => (point.revenuePhp > timeline[best].revenuePhp ? index : best), 0);
  const y = (value: number) => TOP_PAD + PLOT_HEIGHT - (value / maxValue) * PLOT_HEIGHT;
  const baseline = y(0);
  const active = activeIndex === null ? null : timeline[activeIndex];

  return (
    <div className="rc-chart" ref={containerRef}>
      {width > 0 ? (
        <svg width={width} height={TOP_PAD + PLOT_HEIGHT + AXIS_BAND} role="img" aria-label="Revenue over time column chart">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={LEFT_GUTTER} x2={width - 8} y1={y(tick)} y2={y(tick)} className="rc-grid" />
              <text x={LEFT_GUTTER - 8} y={y(tick)} className="rc-axis-text" textAnchor="end" dominantBaseline="middle">
                {compactPeso(tick)}
              </text>
            </g>
          ))}
          {timeline.map((point, index) => {
            const centerX = LEFT_GUTTER + band * index + band / 2;
            const top = y(point.revenuePhp);
            const height = baseline - top;
            const left = centerX - barWidth / 2;
            const radius = Math.min(4, barWidth / 2, height);
            return (
              <g key={point.start}>
                {point.revenuePhp > 0 ? (
                  <path
                    className={`rc-bar ${activeIndex === index ? "is-active" : ""}`}
                    d={`M${left},${baseline} V${top + radius} Q${left},${top} ${left + radius},${top} H${left + barWidth - radius} Q${left + barWidth},${top} ${left + barWidth},${top + radius} V${baseline} Z`}
                  />
                ) : null}
                {index === peakIndex && point.revenuePhp > 0 ? (
                  <text x={centerX} y={top - 6} className="rc-value-text" textAnchor="middle">{compactPeso(point.revenuePhp)}</text>
                ) : null}
                {index % labelEvery === 0 ? (
                  <text x={centerX} y={baseline + 18} className="rc-axis-text" textAnchor="middle">{bucketLabel(point.start, bucket)}</text>
                ) : null}
                <rect
                  className="rc-hit"
                  x={LEFT_GUTTER + band * index}
                  y={TOP_PAD}
                  width={band}
                  height={PLOT_HEIGHT}
                  tabIndex={0}
                  aria-label={`${bucketLabel(point.start, bucket, true)}: ${formatPhpCurrency(point.revenuePhp)} from ${point.orders} orders`}
                  onPointerEnter={() => setActiveIndex(index)}
                  onPointerLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex(null)}
                />
              </g>
            );
          })}
          <line x1={LEFT_GUTTER} x2={width - 8} y1={baseline} y2={baseline} className="rc-baseline" />
        </svg>
      ) : null}
      {active && activeIndex !== null ? (
        <div
          className="rc-tooltip"
          style={{
            left: Math.min(Math.max(LEFT_GUTTER + band * activeIndex + band / 2, 80), width - 80),
            top: Math.max(0, y(active.revenuePhp) - 64)
          }}
          role="status"
        >
          <strong>{formatPhpCurrency(active.revenuePhp)}</strong>
          <span>{bucketLabel(active.start, bucket, true)} · {active.orders} {active.orders === 1 ? "order" : "orders"}</span>
        </div>
      ) : null}
    </div>
  );
};

const STATUS_ORDER: AdminOrderStatus[] = ["Pending", "Ready", "Completed"];

// Part-to-whole: one 100% stacked bar plus a labelled legend (counts and shares always visible).
export const StatusBreakdown = ({ counts }: { counts: AdminReports["statusCounts"] }) => {
  const total = STATUS_ORDER.reduce((sum, status) => sum + counts[status], 0);
  return (
    <div className="rc-status">
      <div className="rc-stack" role="img" aria-label="Orders by status">
        {STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => (
          <span
            key={status}
            className={`rc-stack-segment rc-status-${status.toLowerCase()}`}
            style={{ flexGrow: counts[status] }}
            title={`${status}: ${counts[status]}`}
          />
        ))}
      </div>
      <ul className="rc-legend">
        {STATUS_ORDER.map((status) => (
          <li key={status}>
            <span className={`rc-swatch rc-status-${status.toLowerCase()}`} aria-hidden="true" />
            <span className="rc-legend-label">{status}</span>
            <strong>{counts[status]}</strong>
            <span className="rc-legend-share">{total > 0 ? Math.round((counts[status] / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

interface RankedBarsProps {
  rows: Array<{ id: string; label: string; value: number; valueLabel: string; detail?: string }>;
  ariaLabel: string;
}

// Horizontal single-color bars, value at the tip, ranked high to low.
export const RankedBars = ({ rows, ariaLabel }: RankedBarsProps) => {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="rc-ranked" aria-label={ariaLabel}>
      {rows.map((row) => (
        <li key={row.id}>
          <div className="rc-ranked-top">
            <span className="rc-ranked-label">{row.label}</span>
            {row.detail ? <span className="rc-ranked-detail">{row.detail}</span> : null}
          </div>
          <div className="rc-ranked-bar">
            <span style={{ width: `${(row.value / max) * 100}%` }} />
            <strong>{row.valueLabel}</strong>
          </div>
        </li>
      ))}
    </ul>
  );
};
