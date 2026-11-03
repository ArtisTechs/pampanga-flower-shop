import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { ApiError, errorMessage } from "../../api/client";
import { deleteCombinationPhoto, replaceCombinationPhoto, updateCombinationPhoto } from "../../api/shop";
import type { AdminBuilderOption, CombinationPhoto, CombinationPhotoSelection } from "../../types/shop";
import { resolveImagePath } from "../../utils/assets";
import { IMAGE_UPLOAD_TYPES, validateImageFile } from "../../utils/validation";
import type { ToastTone } from "../AppToast";
import { LoadState } from "../LoadState";
import { AdminDialog, AdminUiIcon as Icon } from "./AdminUi";

const PAGE_SIZE = 48;
const MAX_FLOWER_ROWS = 5;

interface AdminCombinationPhotosProps {
  photos: {
    data: CombinationPhoto[] | null;
    error: string | null;
    reload: () => void;
    updateData: (update: (current: CombinationPhoto[]) => CombinationPhoto[]) => void;
  };
  options: AdminBuilderOption[];
  onToast: (message: string, tone: ToastTone) => void;
}

// The shop's own photos of ready combinations: check them by flower, filler and palette, change which bouquet a photo is
// for, replace one that looks wrong, or remove it so customers get a generated preview for that combination again.
export const AdminCombinationPhotos = ({ photos, options, onToast }: AdminCombinationPhotosProps) => {
  const [search, setSearch] = useState("");
  const [paletteFilter, setPaletteFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<CombinationPhoto | null>(null);
  const [removing, setRemoving] = useState<CombinationPhoto | null>(null);
  // The element at the end of the grid; scrolling it into view loads the next page.
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);

  const palettes = options.filter((option) => option.group === "palette");
  const nameOf = (group: AdminBuilderOption["group"], code: string) =>
    options.find((option) => option.group === group && option.code === code)?.name ?? code;

  const describe = (photo: CombinationPhoto) => ({
    flowers: photo.selection.flowers
      .map(({ code, color, quantity }) => `${quantity} × ${color} ${nameOf("flower", code)}`)
      .join(" + "),
    filler: photo.selection.fillers.length > 0
      ? photo.selection.fillers.map((code) => nameOf("filler", code)).join(", ")
      : "No filler",
    palette: nameOf("palette", photo.selection.palette)
  });

  // Same flowers together, then by filler, quantity and palette, so a combination's six palettes sit side by side.
  const sorted = useMemo(() => {
    const paletteOrder = (code: string) => palettes.findIndex((palette) => palette.code === code);
    const lineOf = (photo: CombinationPhoto) =>
      [...photo.selection.flowers].map(({ code, color }) => `${code}:${color}`).sort().join("+");
    const stemsOf = (photo: CombinationPhoto) => photo.selection.flowers.reduce((total, flower) => total + flower.quantity, 0);
    return [...(photos.data ?? [])].sort((first, second) =>
      lineOf(first).localeCompare(lineOf(second))
      || first.selection.fillers.join().localeCompare(second.selection.fillers.join())
      || stemsOf(first) - stemsOf(second)
      || paletteOrder(first.selection.palette) - paletteOrder(second.selection.palette)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.data, options]);

  // A new observer after every page makes the browser report the sentinel again, so a tall screen keeps loading
  // until the grid fills it.
  useEffect(() => {
    if (!sentinel) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => count + PAGE_SIZE);
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, visibleCount]);

  if (!photos.data) {
    return <LoadState error={photos.error} onRetry={photos.reload} />;
  }

  const query = search.trim().toLowerCase();
  const matching = sorted.filter((photo) => {
    if (paletteFilter !== "all" && photo.selection.palette !== paletteFilter) {
      return false;
    }
    const { flowers, filler, palette } = describe(photo);
    return query === "" || `${flowers} ${filler} ${palette}`.toLowerCase().includes(query);
  });

  const handleReplace = async (photo: CombinationPhoto, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const problem = validateImageFile(file);
    if (problem) {
      onToast(problem, "error");
      return;
    }
    setBusyKey(photo.key);
    try {
      const image = await replaceCombinationPhoto(photo.key, file);
      photos.updateData((current) => current.map((entry) => (entry.key === photo.key ? { ...entry, image } : entry)));
      onToast("Photo replaced. Customers see the new one right away.", "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setBusyKey(null);
    }
  };

  const handleRemove = async (photo: CombinationPhoto) => {
    setBusyKey(photo.key);
    try {
      await deleteCombinationPhoto(photo.key);
      photos.updateData((current) => current.filter((entry) => entry.key !== photo.key));
      setRemoving(null);
      onToast("Photo removed. Customers choosing this bouquet get a generated preview instead.", "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setBusyKey(null);
    }
  };

  // After a swap or replace other photos changed too, so the list is loaded again.
  const handleEdited = (photo: CombinationPhoto, saved: { key: string; selection: CombinationPhotoSelection }, changedOthers: boolean) => {
    if (changedOthers) {
      photos.reload();
    } else {
      photos.updateData((current) =>
        current.map((entry) => (entry.key === photo.key ? { ...entry, key: saved.key, selection: saved.selection } : entry))
      );
    }
    setEditing(null);
    onToast("Photo updated. It now shows for the bouquet you chose.", "success");
  };

  return (
    <section className="admin-ui-panel" aria-label="Combination photos">
      <div className="admin-products-toolbar admin-ui-toolbar-2">
        <label className="admin-products-search">
          <Icon name="search" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search by flower or filler..."
            aria-label="Search combination photos by flower, filler or palette"
          />
        </label>
        <select
          className="admin-products-select"
          value={paletteFilter}
          onChange={(event) => {
            setPaletteFilter(event.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          aria-label="Filter by color palette"
        >
          <option value="all">All palettes</option>
          {palettes.map((palette) => <option key={palette.code} value={palette.code}>{palette.name}</option>)}
        </select>
      </div>

      {photos.data.length === 0 ? (
        <p className="admin-ui-panel-note">No photos yet. They're added with the combination photo import.</p>
      ) : matching.length === 0 ? (
        <p className="admin-ui-panel-note">No photos match your search.</p>
      ) : (
        <ul className="admin-builder-preview-grid">
          {matching.slice(0, visibleCount).map((photo) => {
            const { flowers, filler, palette } = describe(photo);
            const isBusy = busyKey === photo.key;
            return (
              <li key={photo.key}>
                <img src={resolveImagePath(photo.image, 400)} alt={`${flowers}, ${filler}, ${palette}`} loading="lazy" />
                <span>{flowers}</span>
                <span>Filler: {filler}</span>
                <span>Palette: {palette}</span>
                <div className="admin-builder-option-actions">
                  <button type="button" className="admin-ui-link-button" onClick={() => setEditing(photo)} disabled={isBusy}>
                    Edit
                  </button>
                  <label className="admin-ui-link-button" aria-disabled={isBusy}>
                    {isBusy ? "Working..." : "Replace"}
                    <input
                      type="file"
                      hidden
                      accept={IMAGE_UPLOAD_TYPES.join(",")}
                      disabled={isBusy}
                      onChange={(event) => handleReplace(photo, event)}
                    />
                  </label>
                  <button type="button" className="admin-ui-link-button is-danger" onClick={() => setRemoving(photo)} disabled={isBusy}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {matching.length > visibleCount ? (
        <p className="admin-ui-panel-note" ref={setSentinel}>Loading more photos...</p>
      ) : matching.length > 0 ? (
        <p className="admin-ui-panel-note">Showing all {matching.length} photos.</p>
      ) : null}
      <p className="admin-ui-panel-note">
        These are the shop's own photos for Korean wrap with a satin ribbon. Customers see the one that matches their flowers, filler and
        palette; anything else is generated with AI. Edit a photo to change which bouquet it's for, replace one that doesn't look right,
        or remove it to go back to AI for that bouquet.
      </p>

      {editing ? (
        <CombinationPhotoEditDialog
          photo={editing}
          allPhotos={photos.data}
          options={options}
          onClose={() => setEditing(null)}
          onSaved={(saved, changedOthers) => handleEdited(editing, saved, changedOthers)}
        />
      ) : null}

      {removing ? (
        <AdminDialog
          title="Remove this photo?"
          subtitle={`${describe(removing).flowers} · ${describe(removing).filler} · ${describe(removing).palette}`}
          onClose={() => setRemoving(null)}
          isBusy={busyKey === removing.key}
          size="narrow"
          footer={
            <>
              <button type="button" className="admin-products-secondary" onClick={() => setRemoving(null)} disabled={busyKey === removing.key}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-payment-reject-button"
                onClick={() => handleRemove(removing)}
                disabled={busyKey === removing.key}
              >
                {busyKey === removing.key ? "Removing..." : "Remove"}
              </button>
            </>
          }
        >
          <p className="admin-ui-muted">Customers choosing this bouquet will get a generated preview instead. You can replace the photo instead of removing it.</p>
        </AdminDialog>
      ) : null}
    </section>
  );
};

interface FlowerRow {
  code: string;
  color: string;
  quantity: string;
}

// The same bouquet however it was entered: repeated flower and color rows added together, order ignored.
const bouquetSignature = ({ flowers, fillers, palette }: CombinationPhotoSelection) => {
  const stems = new Map<string, number>();
  flowers.forEach(({ code, color, quantity }) => stems.set(`${code}|${color}`, (stems.get(`${code}|${color}`) ?? 0) + quantity));
  return JSON.stringify([[...stems].sort(([first], [second]) => first.localeCompare(second)), [...new Set(fillers)].sort(), palette]);
};

interface CombinationPhotoEditDialogProps {
  photo: CombinationPhoto;
  allPhotos: CombinationPhoto[];
  options: AdminBuilderOption[];
  onClose: () => void;
  onSaved: (saved: { key: string; selection: CombinationPhotoSelection }, changedOthers: boolean) => void;
}

// Which bouquet the photo is for: its flowers (each with a color and count), fillers and color palette.
const CombinationPhotoEditDialog = ({ photo, allPhotos, options, onClose, onSaved }: CombinationPhotoEditDialogProps) => {
  const flowerOptions = options.filter((option) => option.group === "flower");
  const fillerOptions = options.filter((option) => option.group === "filler");
  const paletteOptions = options.filter((option) => option.group === "palette");

  const [rows, setRows] = useState<FlowerRow[]>(
    photo.selection.flowers.map(({ code, color, quantity }) => ({ code, color, quantity: String(quantity) }))
  );
  const [fillers, setFillers] = useState<string[]>(photo.selection.fillers);
  const [palette, setPalette] = useState(photo.selection.palette);
  const [error, setError] = useState<string | null>(null);
  // Set when the chosen bouquet already has a photo; the admin then picks swap or replace.
  const [isTaken, setIsTaken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const flowersToSave = () => rows.map((row) => ({ code: row.code, color: row.color, quantity: Number(row.quantity) }));
  const existing = isTaken
    ? allPhotos.find(
        (entry) => entry.key !== photo.key
          && bouquetSignature(entry.selection) === bouquetSignature({ flowers: flowersToSave(), fillers, palette })
      )
    : undefined;

  const colorsOf = (code: string) => flowerOptions.find((option) => option.code === code)?.colorChoices ?? [];

  const updateRow = (index: number, changes: Partial<FlowerRow>) =>
    setRows((current) => current.map((row, position) => (position === index ? { ...row, ...changes } : row)));

  // A different flower starts on its default color, since the old color may not exist for it.
  const changeFlower = (index: number, code: string) => {
    const colors = colorsOf(code);
    updateRow(index, { code, color: (colors.find((color) => color.isDefault) ?? colors[0])?.name ?? "" });
  };

  const addRow = () => {
    const first = flowerOptions[0];
    if (first) {
      const colors = first.colorChoices;
      setRows((current) => [
        ...current,
        { code: first.code, color: (colors.find((color) => color.isDefault) ?? colors[0])?.name ?? "", quantity: "1" }
      ]);
    }
  };

  const toggleFiller = (code: string) =>
    setFillers((current) => (current.includes(code) ? current.filter((entry) => entry !== code) : [...current, code]));

  const save = async (onConflict?: "swap" | "replace") => {
    const flowers = flowersToSave();
    if (flowers.some((flower) => !Number.isInteger(flower.quantity) || flower.quantity < 1)) {
      setError("Each flower needs a whole number of stems, at least 1.");
      return;
    }
    setError(null);
    setIsTaken(false);
    setIsSaving(true);
    try {
      onSaved(await updateCombinationPhoto(photo.key, { flowers, fillers, palette }, onConflict), onConflict !== undefined);
    } catch (saveError) {
      if (saveError instanceof ApiError && saveError.status === 409) {
        setIsTaken(true);
      } else {
        setError(errorMessage(saveError));
      }
      setIsSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save();
  };

  return (
    <AdminDialog
      title="Edit this photo's bouquet"
      subtitle="Choose the bouquet customers see this photo for."
      onClose={onClose}
      isBusy={isSaving}
      onSubmit={handleSubmit}
      footer={
        <>
          <button type="button" className="admin-products-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="submit" className="admin-products-primary" disabled={isSaving}>{isSaving ? "Saving..." : "Save changes"}</button>
        </>
      }
    >
      <div className="admin-builder-form">
        <fieldset className="admin-product-field admin-builder-colors admin-builder-flower-rows">
          <legend className="admin-product-label">Flowers <em>*</em></legend>
          <ul>
            {rows.map((row, index) => (
              <li key={index}>
                <select value={row.code} onChange={(event) => changeFlower(index, event.target.value)} aria-label={`Flower ${index + 1}`}>
                  {flowerOptions.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
                </select>
                <select value={row.color} onChange={(event) => updateRow(index, { color: event.target.value })} aria-label={`Color of flower ${index + 1}`}>
                  {colorsOf(row.code).map((color) => <option key={color.name} value={color.name}>{color.name}</option>)}
                </select>
                <input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={row.quantity}
                  onChange={(event) => updateRow(index, { quantity: event.target.value })}
                  aria-label={`Stems of flower ${index + 1}`}
                />
                <button
                  type="button"
                  className="admin-ui-link-button is-danger"
                  onClick={() => setRows((current) => current.filter((_, position) => position !== index))}
                  disabled={rows.length === 1}
                  aria-label={`Remove flower ${index + 1}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {rows.length < MAX_FLOWER_ROWS ? (
            <button type="button" className="admin-ui-link-button" onClick={addRow}>
              <Icon name="plus" />
              Add another flower
            </button>
          ) : null}
        </fieldset>

        <fieldset className="admin-product-field admin-builder-colors">
          <legend className="admin-product-label">Fillers</legend>
          {fillerOptions.length === 0 ? <span className="admin-product-hint">No fillers are set up yet.</span> : null}
          <div className="admin-builder-filler-list">
            {fillerOptions.map((option) => (
              <label key={option.code}>
                <input type="checkbox" checked={fillers.includes(option.code)} onChange={() => toggleFiller(option.code)} />
                {option.name}
              </label>
            ))}
          </div>
          <span className="admin-product-hint">Leave all unchecked for a bouquet without filler flowers.</span>
        </fieldset>

        <label className="admin-product-field">
          <span className="admin-product-label">Color palette <em>*</em></span>
          <select value={palette} onChange={(event) => setPalette(event.target.value)}>
            {paletteOptions.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
          </select>
        </label>

        {error ? <span className="admin-product-error" role="alert">{error}</span> : null}

        {isTaken ? (
          <div className="admin-product-field" role="alert">
            <span className="admin-product-label">Another photo already shows for this bouquet</span>
            {existing ? (
              <img
                src={resolveImagePath(existing.image, 240)}
                alt="The photo already used for this bouquet"
                style={{ width: 120, aspectRatio: "1 / 1", objectFit: "contain", borderRadius: 10, border: "1px solid #f6e1df" }}
              />
            ) : null}
            <span className="admin-product-hint">
              Swap: the two photos trade bouquets, so nothing is lost. Replace: this photo takes over and the other one is removed.
            </span>
            <div className="admin-builder-option-actions">
              <button type="button" className="admin-products-secondary" onClick={() => void save("swap")} disabled={isSaving}>
                Swap the two photos
              </button>
              <button type="button" className="admin-ui-link-button is-danger" onClick={() => void save("replace")} disabled={isSaving}>
                Replace the other photo
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </AdminDialog>
  );
};
