import { useState } from "react";
import { errorMessage } from "../api/client";
import { fetchSiteContent, saveSiteContent } from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { useApiData } from "../hooks/useApiData";
import type { Account, SiteContent } from "../types/shop";


interface AdminWebsiteContentPageProps {
  account: Account;
  onLogout: () => void;
  onToast: (message: string, tone: ToastTone) => void;
}

export const AdminWebsiteContentPage = ({ account, onLogout, onToast }: AdminWebsiteContentPageProps) => {
  const content = useApiData(fetchSiteContent, []);

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      {content.data ? (
        <WebsiteContentEditor
          initialContent={content.data}
          onSaved={(saved) => content.updateData(() => saved)}
          onToast={onToast}
        />
      ) : (
        <div className="admin-page admin-website-content-page">
          <h1>Website Content</h1>
          <LoadState error={content.error} onRetry={content.reload} />
        </div>
      )}
    </AdminLayout>
  );
};

interface ContentSection {
  title: string;
  description: string;
  fields: Array<{ key: keyof SiteContent; label: string; multiline?: boolean }>;
}

const contentSections: ContentSection[] = [
  {
    title: "Banner Settings",
    description: "Homepage hero banner content",
    fields: [
      { key: "heroTagline", label: "Tagline" },
      { key: "bannerTitle", label: "Banner Title" },
      { key: "bannerSubtitle", label: "Banner Subtitle" },
      { key: "heroSecondaryCta", label: "Secondary Button Text" }
    ]
  },
  {
    title: "Shop Information",
    description: "Basic shop details shown to customers",
    fields: [
      { key: "shopName", label: "Shop Name" },
      { key: "operatingHours", label: "Operating Hours" }
    ]
  },
  {
    title: "Shop Address",
    description: "Physical location for customer pickup",
    fields: [{ key: "fullAddress", label: "Full Address", multiline: true }]
  },
  {
    title: "About the Shop",
    description: "Shop description displayed on the website",
    fields: [{ key: "aboutText", label: "About Text", multiline: true }]
  },
  {
    title: "Home Page Sections",
    description: "Headings for each section of the home page",
    fields: [
      { key: "occasionsHeading", label: "Occasions Heading" },
      { key: "flowerTypesHeading", label: "Flower Types Heading" },
      { key: "featuresHeading", label: "Features Heading" },
      { key: "reviewsHeading", label: "Reviews Heading" },
      { key: "reviewsSubtitle", label: "Reviews Subtitle" }
    ]
  },
  {
    title: "Philosophy & How It Works",
    description: "Story banner and the ordering steps intro",
    fields: [
      { key: "philosophyBannerTitle", label: "Banner Title" },
      { key: "philosophyBannerText", label: "Banner Text", multiline: true },
      { key: "philosophyHeading", label: "Philosophy Heading" },
      { key: "howItWorksHeading", label: "How It Works Heading" },
      { key: "howItWorksSubtitle", label: "How It Works Subtitle" }
    ]
  },
  {
    title: "Checkout",
    description: "Pick-up and payment details shown at checkout",
    fields: [
      { key: "pickupMethod", label: "Pick-up Method" },
      { key: "paymentMethod", label: "Payment Method" }
    ]
  }
];

interface WebsiteContentEditorProps {
  initialContent: SiteContent;
  onSaved: (content: SiteContent) => void;
  onToast: (message: string, tone: ToastTone) => void;
}

const WebsiteContentEditor = ({ initialContent, onSaved, onToast }: WebsiteContentEditorProps) => {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [savedContent, setSavedContent] = useState<SiteContent>(initialContent);
  const [draftContent, setDraftContent] = useState<SiteContent>(initialContent);
  const [showSavedTag, setShowSavedTag] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveSiteContent(draftContent);
      setSavedContent(saved);
      onSaved(saved);
      setMode("view");
      setShowSavedTag(true);
      window.setTimeout(() => setShowSavedTag(false), 2200);
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const currentContent = mode === "edit" ? draftContent : savedContent;

  return (
    <div className="admin-page admin-website-content-page">
      <div className="admin-website-content-topbar">
        <h1>Website Content</h1>
        <div className="admin-website-content-actions">
          <button type="button" className={mode === "edit" ? "active" : ""} onClick={handleToggleEdit}>
            {mode === "view" ? "Edit Mode" : "View Mode"}
          </button>
          {mode === "edit" ? (
            <button type="button" className="save-button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </button>
          ) : null}
          {showSavedTag ? <span className="saved-tag">Saved</span> : null}
        </div>
      </div>

      <p className="admin-content-hint">Tip: wrap words in *asterisks* in a heading to highlight them in pink italics.</p>

      <div className="admin-website-content-grid">
        {contentSections.map((section) => (
          <section className="admin-content-card" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            {section.fields.map((field) => (
              <label key={field.key}>
                {field.label}
                {mode === "edit" ? (
                  field.multiline ? (
                    <textarea
                      value={draftContent[field.key]}
                      onChange={(event) => setDraftContent((current) => ({ ...current, [field.key]: event.target.value }))}
                    />
                  ) : (
                    <input
                      value={draftContent[field.key]}
                      onChange={(event) => setDraftContent((current) => ({ ...current, [field.key]: event.target.value }))}
                    />
                  )
                ) : (
                  <div className={`admin-content-view ${field.multiline ? "multiline" : ""}`}>{currentContent[field.key]}</div>
                )}
              </label>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
};
