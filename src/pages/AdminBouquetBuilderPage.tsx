import { useState } from "react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { bouquetBuilderSettings, bouquetBuilderTabs } from "../data/bouquetBuilderSettingsData";
import type { BouquetBuilderSettingTab, MockAccount } from "../types/shop";

interface AdminBouquetBuilderPageProps {
  account: MockAccount;
  onLogout: () => void;
}

export const AdminBouquetBuilderPage = ({ account, onLogout }: AdminBouquetBuilderPageProps) => {
  const [activeTab, setActiveTab] = useState<BouquetBuilderSettingTab>("Sizes");
  const settings = bouquetBuilderSettings[activeTab];

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-builder-page">
        <h1>Bouquet Builder Settings</h1>

        <div className="admin-builder-tabs" role="tablist" aria-label="Bouquet builder setting categories">
          {bouquetBuilderTabs.map((tab) => (
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
                      <span className="admin-builder-availability">
                        {setting.available ? "Available" : "Unavailable"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};
