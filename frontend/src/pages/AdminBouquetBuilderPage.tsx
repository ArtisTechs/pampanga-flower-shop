import { useState } from "react";
import { errorMessage } from "../api/client";
import { fetchBuilderOptions, setBuilderOptionAvailability } from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { useApiData } from "../hooks/useApiData";
import type { Account, AdminBuilderOption, BouquetBuilderSettingTab, BuilderOptionGroup } from "../types/shop";

const bouquetBuilderTabs: Array<{ tab: BouquetBuilderSettingTab; group: BuilderOptionGroup }> = [
  { tab: "Sizes", group: "size" },
  { tab: "Flower Varieties", group: "flower" },
  { tab: "Color Palettes", group: "palette" },
  { tab: "Wrap Style", group: "wrap" },
  { tab: "Ribbon Design", group: "ribbon" }
];

interface AdminBouquetBuilderPageProps {
  account: Account;
  onLogout: () => void;
  onToast: (message: string, tone: ToastTone) => void;
}

export const AdminBouquetBuilderPage = ({ account, onLogout, onToast }: AdminBouquetBuilderPageProps) => {
  const [activeTab, setActiveTab] = useState<BouquetBuilderSettingTab>("Sizes");
  const [updatingOptionId, setUpdatingOptionId] = useState<string | null>(null);
  const options = useApiData(fetchBuilderOptions, []);
  const activeGroup = bouquetBuilderTabs.find((entry) => entry.tab === activeTab)?.group ?? "size";
  const settings = (options.data ?? []).filter((option) => option.group === activeGroup);

  const handleToggleAvailability = async (option: AdminBuilderOption) => {
    setUpdatingOptionId(option.id);
    try {
      const updatedOption = await setBuilderOptionAvailability(option.id, !option.available);
      options.updateData((current) => current.map((entry) => (entry.id === option.id ? updatedOption : entry)));
      onToast(`${updatedOption.name} is now ${updatedOption.available ? "available" : "unavailable"}.`, "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setUpdatingOptionId(null);
    }
  };

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-builder-page">
        <h1>Bouquet Builder Settings</h1>

        <div className="admin-builder-tabs" role="tablist" aria-label="Bouquet builder setting categories">
          {bouquetBuilderTabs.map(({ tab }) => (
            <button
              type="button"
              key={tab}
              className={tab === activeTab ? "active" : ""}
              role="tab"
              aria-selected={tab === activeTab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <section className="admin-builder-panel" aria-label={`${activeTab} settings`}>
          {options.data ? (
            <div className="admin-builder-table-wrap">
              <table className="admin-builder-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.map((setting) => (
                    <tr key={setting.id}>
                      <td>{setting.name}</td>
                      <td>{setting.description}</td>
                      <td>
                        <button
                          type="button"
                          className={`admin-builder-availability ${setting.available ? "" : "unavailable"}`}
                          onClick={() => handleToggleAvailability(setting)}
                          disabled={updatingOptionId === setting.id}
                          aria-pressed={setting.available}
                          aria-label={`${setting.name}: ${setting.available ? "available, click to hide from customizer" : "unavailable, click to offer in customizer"}`}
                        >
                          {setting.available ? "Available" : "Unavailable"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <LoadState error={options.error} onRetry={options.reload} />
          )}
        </section>
      </div>
    </AdminLayout>
  );
};
