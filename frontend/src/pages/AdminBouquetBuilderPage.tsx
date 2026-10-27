import { useState, type FormEvent } from "react";
import { errorMessage } from "../api/client";
import {
  createBuilderOption,
  deleteBuilderOption,
  deleteGeneratedPreview,
  fetchBuilderOptions,
  fetchGeneratedPreviews,
  updateBuilderOption,
  uploadBuilderImage
} from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminDialog, AdminPageHeader, AdminSegments, AdminUiIcon as Icon } from "../components/admin/AdminUi";
import { useApiData } from "../hooks/useApiData";
import { useObjectUrl } from "../hooks/useObjectUrl";
import type {
  Account,
  AdminBuilderOption,
  BouquetBuilderSettingTab,
  BuilderOptionGroup,
  BuilderOptionInput,
  FlowerColor,
  GeneratedBouquetPreview
} from "../types/shop";
import { resolveImagePath } from "../utils/assets";
import { formatPhpCurrency } from "../utils/currency";
import { IMAGE_UPLOAD_TYPES, validateImageFile } from "../utils/validation";

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

const groupLabels: Record<BuilderOptionGroup, string> = {
  size: "size",
  flower: "flower",
  filler: "filler",
  palette: "palette",
  wrap: "wrap",
  ribbon: "ribbon"
};
// Groups with a starting choice in the customizer; flowers and fillers start unselected.
const DEFAULT_GROUPS: BuilderOptionGroup[] = ["size", "palette", "wrap", "ribbon"];
// Groups shown as color swatches; palettes need at least one.
const SWATCH_GROUPS: BuilderOptionGroup[] = ["palette", "filler"];
const MAX_SWATCHES = 6;
const MAX_FLOWER_COLORS = 12;
const MAX_DESCRIPTION = 500;
const NEW_COLOR_HEX = "#f39bb0";

const describePreview = ({ selection }: GeneratedBouquetPreview) =>
  [
    selection.flowers
      .map((flower) => `${flower.color ? `${flower.color} ` : ""}${flower.name} ×${flower.quantity}`)
      .join(", "),
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

const swatchesOf = (option: AdminBuilderOption) =>
  option.group === "flower" ? option.colorChoices.map((color) => color.hex) : option.colors;

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
  // null = closed, "new" = add form, otherwise the option being edited.
  const [editing, setEditing] = useState<AdminBuilderOption | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminBuilderOption | null>(null);
  const options = useApiData(fetchBuilderOptions, []);
  const previews = useApiData(fetchGeneratedPreviews, []);
  const allOptions = options.data ?? [];
  const isPreviewTab = activeTab === "AI Previews";
  const activeGroup = isPreviewTab ? null : tabGroups[activeTab];
  const settings = activeGroup ? allOptions.filter((option) => option.group === activeGroup) : [];
  const liveCounts: Partial<Record<BouquetBuilderSettingTab, number>> = {
    ...(options.data
      ? Object.fromEntries(
          optionTabs.map((tab) => [tab, allOptions.filter((option) => option.group === tabGroups[tab] && option.available).length])
        )
      : {}),
    ...(previews.data ? { "AI Previews": previews.data.length } : {})
  };

  const replaceOption = (saved: AdminBuilderOption) => {
    options.updateData((current) =>
      current.map((entry) => {
        if (entry.id === saved.id) {
          return saved;
        }
        // Only one starting choice per group.
        return saved.isDefault && entry.group === saved.group ? { ...entry, isDefault: false } : entry;
      })
    );
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
      replaceOption(updatedOption);
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
      replaceOption(updatedOption);
      onToast(`${updatedOption.name} is now ${updatedOption.available ? "shown in" : "hidden from"} the customizer.`, "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setUpdatingOptionId(null);
    }
  };

  const handleSaved = (saved: AdminBuilderOption, isNew: boolean) => {
    if (isNew) {
      options.updateData((current) => [
        ...current.map((entry) => (saved.isDefault && entry.group === saved.group ? { ...entry, isDefault: false } : entry)),
        saved
      ]);
    } else {
      replaceOption(saved);
    }
    setEditing(null);
    onToast(`${saved.name} was ${isNew ? "added" : "updated"}.`, "success");
  };

  const handleDelete = async (option: AdminBuilderOption) => {
    setUpdatingOptionId(option.id);
    try {
      await deleteBuilderOption(option.id);
      options.updateData((current) => current.filter((entry) => entry.id !== option.id));
      setDeleting(null);
      onToast(`${option.name} was removed from the customizer.`, "success");
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
          actions={activeGroup ? (
            <button type="button" className="admin-products-primary" onClick={() => setEditing("new")} disabled={!options.data}>
              <Icon name="plus" />
              Add {groupLabels[activeGroup]}
            </button>
          ) : null}
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
            {settings.length === 0 ? (
              <p className="admin-ui-panel-note">No {groupLabels[activeGroup!]} options yet. Add one to offer it in the customizer.</p>
            ) : (
              <ul className="admin-ui-option-list">
                {settings.map((option) => (
                  <li key={option.id} className={option.available ? "" : "is-muted"}>
                    {option.imageUrl ? (
                      <img className="admin-builder-option-thumb" src={resolveImagePath(option.imageUrl, 120)} alt="" loading="lazy" />
                    ) : swatchesOf(option).length > 0 ? (
                      <span className="admin-ui-swatches" aria-hidden="true">
                        {swatchesOf(option).map((color, index) => <span key={`${color}-${index}`} style={{ backgroundColor: color }} />)}
                      </span>
                    ) : null}
                    <div className="admin-ui-option-info">
                      <strong>
                        {option.name}
                        {option.isDefault ? <span className="admin-ui-badge status-neutral">Default</span> : null}
                      </strong>
                      <span className="admin-ui-muted">{option.description}</span>
                      {option.group === "flower" ? (
                        <span className="admin-ui-muted admin-builder-option-colors">
                          Colors: {option.colorChoices.map((color) => (color.isDefault ? `${color.name} (default)` : color.name)).join(", ")}
                        </span>
                      ) : null}
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
                    <div className="admin-builder-option-actions">
                      <button
                        type="button"
                        className="admin-ui-link-button"
                        onClick={() => setEditing(option)}
                        disabled={updatingOptionId === option.id}
                        aria-label={`Edit ${option.name}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-ui-link-button is-danger"
                        onClick={() => setDeleting(option)}
                        disabled={updatingOptionId === option.id}
                        aria-label={`Remove ${option.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="admin-ui-panel-note">
              Hidden options don't appear in the customer customizer. Each group keeps at least one option, except fillers, which are optional.
              Prices apply to new orders; set 0 to include an option at no extra cost (sizes always need a price).
            </p>
          </section>
        )}
      </div>

      {editing && activeGroup ? (
        <BuilderOptionFormDialog
          group={editing === "new" ? activeGroup : editing.group}
          option={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onToast={onToast}
        />
      ) : null}

      {deleting ? (
        <AdminDialog
          title={`Remove ${deleting.name}?`}
          subtitle="Customers won't be able to pick it anymore. Orders already placed keep their details."
          onClose={() => setDeleting(null)}
          isBusy={updatingOptionId === deleting.id}
          size="narrow"
          footer={
            <>
              <button
                type="button"
                className="admin-products-secondary"
                onClick={() => setDeleting(null)}
                disabled={updatingOptionId === deleting.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-payment-reject-button"
                onClick={() => handleDelete(deleting)}
                disabled={updatingOptionId === deleting.id}
              >
                {updatingOptionId === deleting.id ? "Removing..." : "Remove"}
              </button>
            </>
          }
        >
          <p className="admin-ui-muted">To keep it for later instead, switch it to Hidden.</p>
        </AdminDialog>
      ) : null}
    </AdminLayout>
  );
};

interface BuilderOptionFormDialogProps {
  group: BuilderOptionGroup;
  option: AdminBuilderOption | null;
  onClose: () => void;
  onSaved: (option: AdminBuilderOption, isNew: boolean) => void;
  onToast: (message: string, tone: ToastTone) => void;
}

type FieldErrors = Partial<Record<"image" | "name" | "price" | "colors", string>>;

const BuilderOptionFormDialog = ({ group, option, onClose, onSaved, onToast }: BuilderOptionFormDialogProps) => {
  const label = groupLabels[group];
  const hasSwatches = SWATCH_GROUPS.includes(group);
  const hasDefault = DEFAULT_GROUPS.includes(group);
  const [name, setName] = useState(option?.name ?? "");
  const [description, setDescription] = useState(option?.description ?? "");
  const [price, setPrice] = useState(option ? String(option.pricePhp) : group === "size" ? "" : "0");
  const [available, setAvailable] = useState(option?.available ?? true);
  const [isDefault, setIsDefault] = useState(option?.isDefault ?? false);
  const [swatches, setSwatches] = useState<string[]>(option?.colors ?? (group === "palette" ? [NEW_COLOR_HEX] : []));
  const [colorChoices, setColorChoices] = useState<FlowerColor[]>(
    option?.colorChoices.length ? option.colorChoices : [{ name: "", hex: NEW_COLOR_HEX, isDefault: true }]
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const filePreviewUrl = useObjectUrl(imageFile);
  const previewUrl = filePreviewUrl ?? (removeImage || !option?.imageUrl ? null : resolveImagePath(option.imageUrl, 600));

  const pickFile = (file: File | undefined) => {
    if (!file) {
      return;
    }
    const problem = validateImageFile(file);
    setErrors((current) => ({ ...current, image: problem }));
    if (!problem) {
      setImageFile(file);
      setRemoveImage(false);
    }
  };

  const updateColorChoice = (index: number, changes: Partial<FlowerColor>) => {
    setColorChoices((current) => current.map((color, position) => (position === index ? { ...color, ...changes } : color)));
  };

  const setDefaultColor = (index: number) => {
    setColorChoices((current) => current.map((color, position) => ({ ...color, isDefault: position === index })));
  };

  // Removing the default color makes the first remaining one the default, so there's always exactly one.
  const removeColorChoice = (index: number) => {
    setColorChoices((current) => {
      const remaining = current.filter((_, position) => position !== index);
      return remaining.some((color) => color.isDefault)
        ? remaining
        : remaining.map((color, position) => ({ ...color, isDefault: position === 0 }));
    });
  };

  const validate = (): FieldErrors => {
    const pricePhp = Number(price);
    const minimum = group === "size" ? 1 : 0;
    const colorNames = colorChoices.map((color) => color.name.trim().toLowerCase());
    let colorsError: string | undefined;
    if (group === "flower") {
      if (colorChoices.length === 0) {
        colorsError = "Add at least one color.";
      } else if (colorNames.some((colorName) => !colorName)) {
        colorsError = "Give every color a name.";
      } else if (new Set(colorNames).size !== colorNames.length) {
        colorsError = "Each color needs a different name.";
      }
    } else if (group === "palette" && swatches.length === 0) {
      colorsError = "Add at least one color.";
    }
    return {
      name: name.trim() ? undefined : `Enter a ${label} name.`,
      price: price.trim() !== "" && Number.isFinite(pricePhp) && pricePhp >= minimum
        && Math.abs(Math.round(pricePhp * 100) - pricePhp * 100) < 1e-6
        ? undefined
        : group === "size" ? "Enter a price above ₱0." : "Enter 0 or more (0 = included).",
      colors: colorsError
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setIsSaving(true);
    try {
      const input: BuilderOptionInput = {
        name: name.trim(),
        description: description.trim(),
        pricePhp: Number(price),
        available,
        ...(hasDefault ? { isDefault } : {}),
        ...(hasSwatches ? { colors: swatches } : {}),
        ...(group === "flower"
          ? { colorChoices: colorChoices.map((color) => ({ ...color, name: color.name.trim() })) }
          : {}),
        ...(group === "wrap"
          ? { imageUrl: imageFile ? await uploadBuilderImage(imageFile) : removeImage ? null : option?.imageUrl ?? null }
          : {})
      };
      const saved = option ? await updateBuilderOption(option.id, input) : await createBuilderOption(group, input);
      onSaved(saved, !option);
    } catch (error) {
      onToast(errorMessage(error), "error");
      setIsSaving(false);
    }
  };

  return (
    <AdminDialog
      title={option ? `Edit ${option.name}` : `Add ${label}`}
      subtitle="Changes show in the customer customizer right after saving."
      onClose={onClose}
      isBusy={isSaving}
      onSubmit={handleSubmit}
      footer={
        <>
          <button type="button" className="admin-products-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="submit" className="admin-products-primary" disabled={isSaving}>
            {isSaving ? "Saving..." : option ? "Save changes" : `Add ${label}`}
          </button>
        </>
      }
    >
      <div className={group === "wrap" ? "admin-payment-form" : "admin-builder-form"}>
        {group === "wrap" ? (
          <div className="admin-product-field">
            <span className="admin-product-label">Photo of the wrap</span>
            <label className={`admin-product-dropzone admin-payment-qr-drop ${previewUrl ? "has-image" : ""} ${errors.image ? "invalid" : ""}`}>
              <input
                type="file"
                accept={IMAGE_UPLOAD_TYPES.join(",")}
                onChange={(event) => {
                  pickFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
                disabled={isSaving}
              />
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Wrap photo preview" />
                  <span className="admin-product-dropzone-overlay">
                    <Icon name="upload" />
                    Change photo
                  </span>
                </>
              ) : (
                <span className="admin-product-dropzone-empty">
                  <Icon name="upload" />
                  <strong>Upload photo</strong>
                  <small>JPG, PNG or WebP · up to 3 MB</small>
                </span>
              )}
            </label>
            {previewUrl ? (
              <button
                type="button"
                className="admin-ui-link-button"
                onClick={() => {
                  setImageFile(null);
                  setRemoveImage(true);
                }}
                disabled={isSaving}
              >
                Remove photo
              </button>
            ) : null}
            <span className="admin-product-hint">Customers see it on the wrap choice; it also guides the AI preview's wrap shape.</span>
            {errors.image ? <span className="admin-product-error">{errors.image}</span> : null}
          </div>
        ) : null}

        <div className="admin-product-fields">
          <div className="admin-product-field-row">
            <label className="admin-product-field">
              <span className="admin-product-label">Name <em>*</em></span>
              <input
                className={errors.name ? "invalid" : ""}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                placeholder={group === "flower" ? "e.g. Tulips" : group === "wrap" ? "e.g. Kraft Paper" : ""}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name ? <span className="admin-product-error">{errors.name}</span> : null}
            </label>
            <label className="admin-product-field">
              <span className="admin-product-label">
                Price {group === "flower" ? "per stem" : ""} <em>*</em>
              </span>
              <span className={`admin-product-price ${errors.price ? "invalid" : ""}`}>
                <span aria-hidden="true">₱</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={group === "size" ? 1 : 0}
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="0.00"
                  aria-invalid={Boolean(errors.price)}
                />
              </span>
              {errors.price ? <span className="admin-product-error">{errors.price}</span> : null}
            </label>
          </div>

          <label className="admin-product-field">
            <span className="admin-product-label">
              Description
              <small>{description.length}/{MAX_DESCRIPTION}</small>
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={MAX_DESCRIPTION}
              rows={3}
            />
          </label>

          {group === "flower" ? (
            <fieldset className="admin-product-field admin-builder-colors">
              <legend className="admin-product-label">Colors customers can pick <em>*</em></legend>
              <ul>
                {colorChoices.map((color, index) => (
                  <li key={index}>
                    <input
                      type="color"
                      value={color.hex}
                      onChange={(event) => updateColorChoice(index, { hex: event.target.value })}
                      aria-label={`Color ${index + 1} swatch`}
                    />
                    <input
                      value={color.name}
                      onChange={(event) => updateColorChoice(index, { name: event.target.value })}
                      maxLength={40}
                      placeholder="e.g. Red"
                      aria-label={`Color ${index + 1} name`}
                    />
                    <label className="admin-builder-color-default">
                      <input
                        type="radio"
                        name="default-flower-color"
                        checked={color.isDefault}
                        onChange={() => setDefaultColor(index)}
                      />
                      Default
                    </label>
                    <button
                      type="button"
                      className="admin-ui-link-button is-danger"
                      onClick={() => removeColorChoice(index)}
                      disabled={colorChoices.length === 1}
                      aria-label={`Remove color ${color.name || index + 1}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              {colorChoices.length < MAX_FLOWER_COLORS ? (
                <button
                  type="button"
                  className="admin-ui-link-button"
                  onClick={() => setColorChoices((current) => [...current, { name: "", hex: NEW_COLOR_HEX, isDefault: false }])}
                >
                  + Add color
                </button>
              ) : null}
              <span className="admin-product-hint">
                Only offer colors this flower is really sold in. The default is picked first in the customizer.
              </span>
              {errors.colors ? <span className="admin-product-error">{errors.colors}</span> : null}
            </fieldset>
          ) : null}

          {hasSwatches ? (
            <fieldset className="admin-product-field admin-builder-colors">
              <legend className="admin-product-label">
                Swatch colors {group === "palette" ? <em>*</em> : null}
              </legend>
              <div className="admin-builder-swatch-row">
                {swatches.map((color, index) => (
                  <span key={index} className="admin-builder-swatch-edit">
                    <input
                      type="color"
                      value={color}
                      onChange={(event) =>
                        setSwatches((current) => current.map((entry, position) => (position === index ? event.target.value : entry)))
                      }
                      aria-label={`Swatch ${index + 1}`}
                    />
                    <button
                      type="button"
                      className="admin-builder-swatch-remove"
                      onClick={() => setSwatches((current) => current.filter((_, position) => position !== index))}
                      aria-label={`Remove swatch ${index + 1}`}
                    >
                      <Icon name="close" />
                    </button>
                  </span>
                ))}
                {swatches.length < MAX_SWATCHES ? (
                  <button
                    type="button"
                    className="admin-ui-link-button"
                    onClick={() => setSwatches((current) => [...current, NEW_COLOR_HEX])}
                  >
                    + Add color
                  </button>
                ) : null}
              </div>
              {group === "palette" ? (
                <span className="admin-product-hint">The palette colors the wrapper and ribbon only, not the flowers.</span>
              ) : null}
              {errors.colors ? <span className="admin-product-error">{errors.colors}</span> : null}
            </fieldset>
          ) : null}

          <label className="admin-payment-toggle">
            <input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} />
            Show in the customizer
          </label>
          {hasDefault ? (
            <label className="admin-payment-toggle">
              <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
              Starting choice for this group
            </label>
          ) : null}
        </div>
      </div>
    </AdminDialog>
  );
};
