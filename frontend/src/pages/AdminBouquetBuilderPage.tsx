import { useState } from "react";
import { errorMessage } from "../api/client";
import { fetchBuilderOptions, setBuilderOptionAvailability } from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminPageHeader, AdminSegments } from "../components/admin/AdminUi";
import { useApiData } from "../hooks/useApiData";
import type { Account, AdminBuilderOption, BouquetBuilderSettingTab, BuilderOptionGroup } from "../types/shop";
import { formatPhpCurrency } from "../utils/currency";

const tabGroups: Record<BouquetBuilderSettingTab, BuilderOptionGroup> = {
  Sizes: "size",
  "Flower Varieties": "flower",
  "Color Palettes": "palette",
  "Wrap Style": "wrap",
  "Ribbon Design": "ribbon"
};
const tabs = Object.keys(tabGroups) as BouquetBuilderSettingTab[];

const priceLabel = (option: AdminBuilderOption) => {
  if (option.group === "size") {
    return `${formatPhpCurrency(option.pricePhp)} base`;
  }
  if (option.group === "flower") {
    return `+${formatPhpCurrency(option.pricePhp)} / stem`;
  }
  return "Included";
};

interface AdminBouquetBuilderPageProps {
  account: Account;
  onLogout: () => void;
  onToast: (message: string, tone: ToastTone) => void;
}

export const AdminBouquetBuilderPage = ({ account, onLogout, onToast }: AdminBouquetBuilderPageProps) => {
  const [activeTab, setActiveTab] = useState<BouquetBuilderSettingTab>("Sizes");
  const [updatingOptionId, setUpdatingOptionId] = useState<string | null>(null);
  const options = useApiData(fetchBuilderOptions, []);
  const allOptions = options.data ?? [];
  const settings = allOptions.filter((option) => option.group === tabGroups[activeTab]);
  const liveCounts = Object.fromEntries(
    tabs.map((tab) => [tab, allOptions.filter((option) => option.group === tabGroups[tab] && option.available).length])
  ) as Record<BouquetBuilderSettingTab, number>;

  const handleToggleAvailability = async (option: AdminBuilderOption) => {
    setUpdatingOptionId(option.id);
    try {
      const updatedOption = await setBuilderOptionAvailability(option.id, !option.available);
      options.updateData((current) => current.map((entry) => (entry.id === option.id ? updatedOption : entry)));
      onToast(`${updatedOption.name} is now ${updatedOption.available ? "shown in" : "hidden from"} the customizer.`, "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setUpdatingOptionId(null);
    }
  };

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-products-page">
        <AdminPageHeader
          title="Bouquet Builder"
          subtitle="Choose which options customers can pick when they design their own bouquet."
        />

        <section className="admin-products-toolbar admin-ui-toolbar-tabs" aria-label="Option groups">
          <AdminSegments
            label="Option group"
            options={tabs}
            value={activeTab}
            onChange={setActiveTab}
            counts={options.data ? liveCounts : undefined}
          />
        </section>

        {!options.data ? (
          <LoadState error={options.error} onRetry={options.reload} />
        ) : (
          <section className="admin-ui-panel" aria-label={`${activeTab} options`}>
            <ul className="admin-ui-option-list">
              {settings.map((option) => (
                <li key={option.id} className={option.available ? "" : "is-muted"}>
                  {option.colors.length > 0 ? (
                    <span className="admin-ui-swatches" aria-hidden="true">
                      {option.colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}
                    </span>
                  ) : null}
                  <div className="admin-ui-option-info">
                    <strong>
                      {option.name}
                      {option.isDefault ? <span className="admin-ui-badge status-neutral">Default</span> : null}
                    </strong>
                    <span className="admin-ui-muted">{option.description}</span>
                  </div>
                  <span className="admin-ui-option-price">{priceLabel(option)}</span>
                  <label className="admin-product-switch admin-ui-option-switch">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={option.available}
                      disabled={updatingOptionId === option.id}
                      onChange={() => handleToggleAvailability(option)}
                      aria-label={`Offer ${option.name} in the customizer`}
                    />
                    <span className="admin-product-switch-track" aria-hidden="true" />
                    <small>{option.available ? "Shown" : "Hidden"}</small>
                  </label>
                </li>
              ))}
            </ul>
            <p className="admin-ui-panel-note">Hidden options don't appear in the customer customizer. Each group keeps at least one option.</p>
          </section>
        )}
      </div>
    </AdminLayout>
  );
};
