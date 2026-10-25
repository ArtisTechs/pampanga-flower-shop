import { useState, type FormEvent } from "react";
import { errorMessage } from "../api/client";
import { deleteGeneratedPreview, fetchBuilderOptions, fetchGeneratedPreviews, updateBuilderOption } from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminPageHeader, AdminSegments } from "../components/admin/AdminUi";
import { useApiData } from "../hooks/useApiData";
import type {
  Account,
  AdminBuilderOption,
  BouquetBuilderSettingTab,
  BuilderOptionGroup,
  GeneratedBouquetPreview
} from "../types/shop";
import { formatPhpCurrency } from "../utils/currency";

type OptionTab = Exclude<BouquetBuilderSettingTab, "AI Previews">;

const tabGroups: Record<OptionTab, BuilderOptionGroup> = {
  Sizes: "size",
  "Flower Varieties": "flower",
  Fillers: "filler",
  "Color Palettes": "palette",
  "Wrap Style": "wrap",
  "Ribbon Design": "ribbon"
};
const optionTabs = Object.keys(tabGroups) as OptionTab[];
const tabs: BouquetBuilderSettingTab[] = [...optionTabs, "AI Previews"];

const describePreview = ({ selection }: GeneratedBouquetPreview) =>
  [
    selection.flowers.map((flower) => `${flower.name} ×${flower.quantity}`).join(", "),
    selection.fillers.length > 0 ? `Fillers: ${selection.fillers.join(", ")}` : null,
    `${selection.palette} · ${selection.wrap} · ${selection.ribbon}`
  ].filter(Boolean);

const priceUnit = (option: AdminBuilderOption) => {
  if (option.group === "size") {
    return "base";
  }
  if (option.group === "flower") {
    return "/ stem";
  }
  return option.pricePhp === 0 ? "included" : "add-on";
};

interface OptionPriceEditorProps {
  option: AdminBuilderOption;
  isSaving: boolean;
  onSave: (option: AdminBuilderOption, pricePhp: number) => void;
}

// Inline price field; Save appears once the amount changes. Remounted (via key) after each save.
const OptionPriceEditor = ({ option, isSaving, onSave }: OptionPriceEditorProps) => {
  const [draft, setDraft] = useState(String(option.pricePhp));
  const draftPrice = Number(draft);
  const minimum = option.group === "size" ? 1 : 0;
  const isValid = draft.trim() !== "" && Number.isFinite(draftPrice) && draftPrice >= minimum
    && Math.abs(Math.round(draftPrice * 100) - draftPrice * 100) < 1e-6;
  const isDirty = draft.trim() !== "" && draftPrice !== option.pricePhp;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDirty && isValid) {
      onSave(option, draftPrice);
    }
  };

  return (
    <form className="admin-ui-option-price-form" onSubmit={handleSubmit}>
      <label className={`admin-ui-option-price-input ${isValid ? "" : "is-invalid"}`}>
        <span aria-hidden="true">₱</span>
        <input
          type="number"
          inputMode="decimal"
          min={minimum}
          step="0.01"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={isSaving}
          aria-label={`${option.name} price in pesos`}
          aria-invalid={!isValid}
        />
      </label>
      <small>{priceUnit(option)}</small>
      {isDirty ? (
        <button type="submit" className="admin-ui-link-button" disabled={isSaving || !isValid}>
          Save
        </button>
      ) : null}
    </form>
  );
};

interface AdminBouquetBuilderPageProps {
  account: Account;
  onLogout: () => void;
  onToast: (message: string, tone: ToastTone) => void;
}

export const AdminBouquetBuilderPage = ({ account, onLogout, onToast }: AdminBouquetBuilderPageProps) => {
  const [activeTab, setActiveTab] = useState<BouquetBuilderSettingTab>("Sizes");
  const [updatingOptionId, setUpdatingOptionId] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const options = useApiData(fetchBuilderOptions, []);
  const previews = useApiData(fetchGeneratedPreviews, []);
  const allOptions = options.data ?? [];
  const isPreviewTab = activeTab === "AI Previews";
  const settings = isPreviewTab ? [] : allOptions.filter((option) => option.group === tabGroups[activeTab]);
  const liveCounts: Partial<Record<BouquetBuilderSettingTab, number>> = {
    ...(options.data
      ? Object.fromEntries(
          optionTabs.map((tab) => [tab, allOptions.filter((option) => option.group === tabGroups[tab] && option.available).length])
        )
      : {}),
    ...(previews.data ? { "AI Previews": previews.data.length } : {})
  };

  const handleRemovePreview = async (preview: GeneratedBouquetPreview) => {
    setRemovingKey(preview.key);
    try {
      await deleteGeneratedPreview(preview.key);
      previews.updateData((current) => current.filter((entry) => entry.key !== preview.key));
      onToast("Preview removed. A new one will be generated the next time a customer picks this bouquet.", "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setRemovingKey(null);
    }
  };

  const handleSavePrice = async (option: AdminBuilderOption, pricePhp: number) => {
    setUpdatingOptionId(option.id);
    try {
      const updatedOption = await updateBuilderOption(option.id, { pricePhp });
      options.updateData((current) => current.map((entry) => (entry.id === option.id ? updatedOption : entry)));
      onToast(`${updatedOption.name} now costs ${formatPhpCurrency(updatedOption.pricePhp)}.`, "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setUpdatingOptionId(null);
    }
  };

  const handleToggleAvailability = async (option: AdminBuilderOption) => {
    setUpdatingOptionId(option.id);
    try {
      const updatedOption = await updateBuilderOption(option.id, { available: !option.available });
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
          subtitle="Choose which options customers can pick when they design their own bouquet, and what each one costs."
        />

        <section className="admin-products-toolbar admin-ui-toolbar-tabs" aria-label="Option groups">
          <AdminSegments
            label="Option group"
            options={tabs}
            value={activeTab}
            onChange={setActiveTab}
            counts={liveCounts}
          />
        </section>

        {isPreviewTab ? (
          !previews.data ? (
            <LoadState error={previews.error} onRetry={previews.reload} />
          ) : (
            <section className="admin-ui-panel" aria-label="AI-generated previews">
              {previews.data.length === 0 ? (
                <p className="admin-ui-panel-note">No previews yet. They're created the first time a customer previews a new bouquet.</p>
              ) : (
                <ul className="admin-builder-preview-grid">
                  {previews.data.map((preview) => (
                    <li key={preview.key}>
                      <img src={preview.image} alt="" loading="lazy" />
                      {describePreview(preview).map((line) => <span key={line}>{line}</span>)}
                      <button
                        type="button"
                        className="admin-ui-link-button"
                        onClick={() => handleRemovePreview(preview)}
                        disabled={removingKey === preview.key}
                      >
                        Regenerate next time
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="admin-ui-panel-note">
                Each bouquet combination is generated once with AI and reused. Remove one that doesn't look right and it will be generated again.
              </p>
            </section>
          )
        ) : !options.data ? (
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
                  <OptionPriceEditor
                    key={`${option.id}-${option.pricePhp}`}
                    option={option}
                    isSaving={updatingOptionId === option.id}
                    onSave={handleSavePrice}
                  />
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
            <p className="admin-ui-panel-note">
              Hidden options don't appear in the customer customizer. Each group keeps at least one option, except fillers, which are optional.
              Prices apply to new orders; set 0 to include an option at no extra cost (sizes always need a price).
            </p>
          </section>
        )}
      </div>
    </AdminLayout>
  );
};
