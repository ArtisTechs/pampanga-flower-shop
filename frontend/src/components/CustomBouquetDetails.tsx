import type { CustomBouquetSummary, OrderItemDetail } from "../types/shop";

interface CustomBouquetDetailsProps {
  summary: CustomBouquetSummary;
  className?: string;
}

// Everything the customer picked for a custom bouquet, including each flower's count.
export const CustomBouquetDetails = ({ summary, className = "" }: CustomBouquetDetailsProps) => {
  const rows: Array<[string, string]> = [
    ["Size", summary.size],
    ["Flowers", summary.flowers.map((flower) => `${flower.name} × ${flower.quantity}`).join(", ")],
    ["Fillers", summary.fillers.join(", ")],
    ["Palette", summary.palette],
    ["Wrap", summary.wrap],
    ["Ribbon", summary.ribbon]
  ];

  return (
    <dl className={`bouquet-details ${className}`}>
      {rows.filter(([, value]) => value).map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
};

export const orderItemBouquetSummary = (item: OrderItemDetail): CustomBouquetSummary | null =>
  item.customization
    ? {
        size: item.customization.size,
        palette: item.customization.palette,
        wrap: item.customization.wrap,
        ribbon: item.customization.ribbon,
        flowers: item.flowers,
        fillers: item.customization.fillers ?? []
      }
    : null;
