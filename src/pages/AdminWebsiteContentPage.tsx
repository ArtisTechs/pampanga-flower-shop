import { useState } from "react";
import { AdminLayout } from "../components/admin/AdminLayout";
import type { MockAccount } from "../types/shop";

interface WebsiteContentState {
  bannerTitle: string;
  bannerSubtitle: string;
  shopName: string;
  operatingHours: string;
  fullAddress: string;
  aboutText: string;
}

const defaultWebsiteContent: WebsiteContentState = {
  bannerTitle: "Create Your Dream Bouquet",
  bannerSubtitle: "Mix flowers and design a bouquet",
  shopName: "Pampanga Flower Shop",
  operatingHours: "Mon-Sat 8AM-6PM",
  fullAddress: "123 San Fernando Blvd, San Fernando, Pampanga, Philippines",
  aboutText: "We craft fresh handcrafted bouquets for birthdays, anniversaries, and everyday surprises."
};

interface AdminWebsiteContentPageProps {
  account: MockAccount;
  onLogout: () => void;
}

export const AdminWebsiteContentPage = ({ account, onLogout }: AdminWebsiteContentPageProps) => {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [savedContent, setSavedContent] = useState<WebsiteContentState>(defaultWebsiteContent);
  const [draftContent, setDraftContent] = useState<WebsiteContentState>(defaultWebsiteContent);
  const [showSavedTag, setShowSavedTag] = useState(false);

  const handleToggleEdit = () => {
    if (mode === "view") {
      setDraftContent(savedContent);
      setMode("edit");
      setShowSavedTag(false);
      return;
    }

    setMode("view");
    setDraftContent(savedContent);
    setShowSavedTag(false);
  };

  const handleSave = () => {
    setSavedContent(draftContent);
    setMode("view");
    setShowSavedTag(true);
    window.setTimeout(() => setShowSavedTag(false), 2200);
  };

  const currentContent = mode === "edit" ? draftContent : savedContent;

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-website-content-page">
        <div className="admin-website-content-topbar">
          <h1>Website Content</h1>
          <div className="admin-website-content-actions">
            <button type="button" className={mode === "edit" ? "active" : ""} onClick={handleToggleEdit}>
              {mode === "view" ? "Edit Mode" : "View Mode"}
            </button>
            {mode === "edit" ? (
              <button type="button" className="save-button" onClick={handleSave}>
                Save
              </button>
            ) : null}
            {showSavedTag ? <span className="saved-tag">Saved</span> : null}
          </div>
        </div>

        <div className="admin-website-content-grid">
          <section className="admin-content-card">
            <h2>Banner Settings</h2>
            <p>Homepage hero banner content</p>
            <label>
              Banner Title
              {mode === "edit" ? (
                <input
                  value={draftContent.bannerTitle}
                  onChange={(event) => setDraftContent((current) => ({ ...current, bannerTitle: event.target.value }))}
                />
              ) : (
                <div className="admin-content-view">{currentContent.bannerTitle}</div>
              )}
            </label>
            <label>
              Banner Subtitle
              {mode === "edit" ? (
                <input
                  value={draftContent.bannerSubtitle}
                  onChange={(event) => setDraftContent((current) => ({ ...current, bannerSubtitle: event.target.value }))}
                />
              ) : (
                <div className="admin-content-view">{currentContent.bannerSubtitle}</div>
              )}
            </label>
          </section>

          <section className="admin-content-card">
            <h2>Shop Information</h2>
            <p>Basic shop details shown to customers</p>
            <label>
              Shop Name
              {mode === "edit" ? (
                <input
                  value={draftContent.shopName}
                  onChange={(event) => setDraftContent((current) => ({ ...current, shopName: event.target.value }))}
                />
              ) : (
                <div className="admin-content-view">{currentContent.shopName}</div>
              )}
            </label>
            <label>
              Operating Hours
              {mode === "edit" ? (
                <input
                  value={draftContent.operatingHours}
                  onChange={(event) => setDraftContent((current) => ({ ...current, operatingHours: event.target.value }))}
                />
              ) : (
                <div className="admin-content-view">{currentContent.operatingHours}</div>
              )}
            </label>
          </section>

          <section className="admin-content-card">
            <h2>Shop Address</h2>
            <p>Physical location for customer pickup</p>
            <label>
              Full Address
              {mode === "edit" ? (
                <textarea
                  value={draftContent.fullAddress}
                  onChange={(event) => setDraftContent((current) => ({ ...current, fullAddress: event.target.value }))}
                />
              ) : (
                <div className="admin-content-view multiline">{currentContent.fullAddress}</div>
              )}
            </label>
          </section>

          <section className="admin-content-card">
            <h2>About the Shop</h2>
            <p>Shop description displayed on the website</p>
            <label>
              About Text
              {mode === "edit" ? (
                <textarea
                  value={draftContent.aboutText}
                  onChange={(event) => setDraftContent((current) => ({ ...current, aboutText: event.target.value }))}
                />
              ) : (
                <div className="admin-content-view multiline">{currentContent.aboutText}</div>
              )}
            </label>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};
