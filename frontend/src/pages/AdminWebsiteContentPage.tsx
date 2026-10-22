import { useEffect, useState } from "react";
import { errorMessage } from "../api/client";
import { fetchSiteContent, saveSiteContent } from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminPageHeader } from "../components/admin/AdminUi";
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
        <div className="admin-page admin-products-page">
          <AdminPageHeader title="Website Content" />
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
  const [savedContent, setSavedContent] = useState<SiteContent>(initialContent);
  const [draftContent, setDraftContent] = useState<SiteContent>(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const changedCount = (Object.keys(draftContent) as Array<keyof SiteContent>)
    .filter((key) => draftContent[key] !== savedContent[key]).length;
  const isDirty = changedCount > 0;

  // Warn before leaving the page with unsaved edits.
  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleSave = async () => {
    const emptyField = contentSections
      .flatMap((section) => section.fields)
      .find((field) => !draftContent[field.key].trim());
    if (emptyField) {
      onToast(`"${emptyField.label}" can't be empty.`, "error");
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveSiteContent(draftContent);
      setSavedContent(saved);
      setDraftContent(saved);
      onSaved(saved);
      onToast("Website content saved. Changes are live on the storefront.", "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-page admin-products-page admin-ui-content-page">
      <AdminPageHeader
        title="Website Content"
        subtitle={<>Text shown on the storefront. Wrap words in <code>*asterisks*</code> in a heading to highlight them.</>}
        actions={
          <a className="admin-products-secondary" href={import.meta.env.BASE_URL} target="_blank" rel="noreferrer">
            View site ↗
          </a>
        }
      />

      <div className="admin-ui-content-grid">
        {contentSections.map((section) => (
          <section className="admin-ui-panel admin-ui-content-card" key={section.title}>
            <h2>{section.title}</h2>
            <p className="admin-ui-muted">{section.description}</p>
            {section.fields.map((field) => {
              const isChanged = draftContent[field.key] !== savedContent[field.key];
              return (
                <label className="admin-product-field" key={field.key}>
                  <span className="admin-product-label">
                    {field.label}
                    {isChanged ? <small className="admin-ui-changed">Edited</small> : null}
                  </span>
                  {field.multiline ? (
                    <textarea
                      rows={3}
                      value={draftContent[field.key]}
                      onChange={(event) => setDraftContent((current) => ({ ...current, [field.key]: event.target.value }))}
                    />
                  ) : (
                    <input
                      value={draftContent[field.key]}
                      onChange={(event) => setDraftContent((current) => ({ ...current, [field.key]: event.target.value }))}
                    />
                  )}
                </label>
              );
            })}
          </section>
        ))}
      </div>

      {isDirty ? (
        <div className="admin-ui-savebar" role="status">
          <span>{changedCount} unsaved {changedCount === 1 ? "change" : "changes"}</span>
          <div>
            <button type="button" className="admin-products-secondary" onClick={() => setDraftContent(savedContent)} disabled={isSaving}>
              Discard
            </button>
            <button type="button" className="admin-products-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
