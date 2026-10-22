import { useState } from "react";
import { fetchAdminReports } from "../api/shop";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminPageHeader, AdminSegments } from "../components/admin/AdminUi";
import { bucketLabel, RankedBars, RevenueColumnChart, StatusBreakdown } from "../components/admin/ReportCharts";
import { useApiData } from "../hooks/useApiData";
import type { Account, AdminReports, ReportRange } from "../types/shop";
import { formatPhpCurrency } from "../utils/currency";

const rangeOptions = ["7 days", "30 days", "90 days", "12 months", "All time"] as const;
type RangeLabel = (typeof rangeOptions)[number];
const rangeKeys: Record<RangeLabel, ReportRange> = {
  "7 days": "7d",
  "30 days": "30d",
  "90 days": "90d",
  "12 months": "12m",
  "All time": "all"
};

const longDate = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const formatRange = (report: AdminReports) =>
  `${longDate.format(new Date(`${report.from}T00:00:00Z`))} – ${longDate.format(new Date(`${report.to}T00:00:00Z`))}`;

interface Delta {
  text: string;
  tone: "up" | "down" | "flat";
}

// Change vs the previous period of the same length; up is good for every metric here.
const deltaFor = (current: number, previous: number | undefined): Delta | null => {
  if (previous === undefined) return null;
  if (previous === 0) return current > 0 ? { text: "New vs. previous period", tone: "up" } : { text: "Same as previous period", tone: "flat" };
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return { text: "Same as previous period", tone: "flat" };
  return { text: `${change > 0 ? "▲" : "▼"} ${Math.abs(change)}% vs. previous period`, tone: change > 0 ? "up" : "down" };
};

interface StatTileProps {
  label: string;
  value: string;
  delta?: Delta | null;
  hint?: string;
}

const StatTile = ({ label, value, delta, hint }: StatTileProps) => (
  <article className="rc-tile">
    <p>{label}</p>
    <strong>{value}</strong>
    {delta ? <span className={`rc-delta ${delta.tone}`}>{delta.text}</span> : hint ? <span className="rc-delta flat">{hint}</span> : null}
  </article>
);

interface AdminReportsPageProps {
  account: Account;
  onLogout: () => void;
}

export const AdminReportsPage = ({ account, onLogout }: AdminReportsPageProps) => {
  const [rangeLabel, setRangeLabel] = useState<RangeLabel>("12 months");
  const [showRevenueTable, setShowRevenueTable] = useState(false);
  const reports = useApiData(() => fetchAdminReports(rangeKeys[rangeLabel]), [rangeLabel]);
  const report = reports.data;
  const isEmpty = report !== null && report.totals.orders === 0;

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-products-page admin-reports-page">
        <AdminPageHeader
          title="Reports"
          subtitle={report ? `Orders placed ${formatRange(report)}` : "Sales and order trends"}
        />

        <section className="admin-products-toolbar admin-ui-toolbar-tabs rc-range" aria-label="Report period">
          <AdminSegments label="Report period" options={rangeOptions} value={rangeLabel} onChange={setRangeLabel} />
        </section>

        {!report ? (
          <LoadState error={reports.error} onRetry={reports.reload} />
        ) : (
          // While a new range loads, keep the previous numbers on screen, dimmed.
          <div className={`rc-body ${reports.isLoading ? "is-refreshing" : ""}`} aria-busy={reports.isLoading}>
            <section className="rc-tiles" aria-label="Key figures">
              <StatTile
                label="Revenue"
                value={formatPhpCurrency(report.totals.revenuePhp)}
                delta={deltaFor(report.totals.revenuePhp, report.previous?.revenuePhp)}
                hint="All orders, any status"
              />
              <StatTile
                label="Orders"
                value={String(report.totals.orders)}
                delta={deltaFor(report.totals.orders, report.previous?.orders)}
              />
              <StatTile label="Average order" value={formatPhpCurrency(report.totals.averageOrderPhp)} hint="Revenue ÷ orders" />
              <StatTile label="From custom bouquets" value={`${report.totals.customRevenueSharePct}%`} hint="Share of revenue" />
            </section>

            {isEmpty ? (
              <div className="admin-products-empty" role="status">
                <h2>No orders in this period</h2>
                <p>Try a longer period, like 12 months or All time.</p>
              </div>
            ) : (
              <>
                <section className="admin-ui-panel rc-card" aria-labelledby="revenue-title">
                  <header className="rc-card-header">
                    <div>
                      <h2 id="revenue-title">Revenue over time</h2>
                      <p className="admin-ui-muted">Per {report.bucket}{showRevenueTable ? "" : " · hover a column for details"}</p>
                    </div>
                    <button type="button" className="admin-ui-link-button rc-toggle" onClick={() => setShowRevenueTable((current) => !current)}>
                      {showRevenueTable ? "Show chart" : "Show table"}
                    </button>
                  </header>
                  {showRevenueTable ? (
                    <div className="rc-table-wrap">
                      <table className="admin-ui-table rc-table">
                        <thead>
                          <tr>
                            <th>Period</th>
                            <th className="numeric">Orders</th>
                            <th className="numeric">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.timeline.map((point) => (
                            <tr key={point.start}>
                              <td>{bucketLabel(point.start, report.bucket, true)}</td>
                              <td className="numeric">{point.orders}</td>
                              <td className="numeric">{formatPhpCurrency(point.revenuePhp)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <RevenueColumnChart timeline={report.timeline} bucket={report.bucket} />
                  )}
                </section>

                <div className="rc-grid-2">
                  <section className="admin-ui-panel rc-card" aria-labelledby="status-title">
                    <header className="rc-card-header">
                      <div>
                        <h2 id="status-title">Orders by status</h2>
                        <p className="admin-ui-muted">{report.totals.orders} orders in this period</p>
                      </div>
                    </header>
                    <StatusBreakdown counts={report.statusCounts} />
                  </section>

                  <section className="admin-ui-panel rc-card" aria-labelledby="top-title">
                    <header className="rc-card-header">
                      <div>
                        <h2 id="top-title">Top sellers</h2>
                        <p className="admin-ui-muted">By revenue</p>
                      </div>
                    </header>
                    <RankedBars
                      ariaLabel="Top sellers by revenue"
                      rows={report.topItems.map((item) => ({
                        id: item.name,
                        label: item.name,
                        value: item.revenuePhp,
                        valueLabel: formatPhpCurrency(item.revenuePhp),
                        detail: `${item.quantity} sold`
                      }))}
                    />
                  </section>
                </div>

                <section className="admin-ui-panel rc-card" aria-labelledby="flowers-title">
                  <header className="rc-card-header">
                    <div>
                      <h2 id="flowers-title">Flowers used in custom bouquets</h2>
                      <p className="admin-ui-muted">Stems ordered · helps plan restocking</p>
                    </div>
                  </header>
                  {report.popularFlowers.length === 0 ? (
                    <p className="admin-ui-muted admin-ui-empty-line">No custom bouquets in this period.</p>
                  ) : (
                    <RankedBars
                      ariaLabel="Stems ordered per flower"
                      rows={report.popularFlowers.map((flower) => ({
                        id: flower.id,
                        label: flower.name,
                        value: flower.stems,
                        valueLabel: `${flower.stems} ${flower.stems === 1 ? "stem" : "stems"}`,
                        detail: `${flower.orders} ${flower.orders === 1 ? "order" : "orders"}`
                      }))}
                    />
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
