import { useMemo, useState, type ChangeEvent } from "react";
import { errorMessage } from "../../api/client";
import { deleteCombinationPhoto, replaceCombinationPhoto } from "../../api/shop";
import type { AdminBuilderOption, CombinationPhoto } from "../../types/shop";
import { resolveImagePath } from "../../utils/assets";
import { IMAGE_UPLOAD_TYPES, validateImageFile } from "../../utils/validation";
import type { ToastTone } from "../AppToast";
import { LoadState } from "../LoadState";
import { AdminDialog, AdminUiIcon as Icon } from "./AdminUi";

const PAGE_SIZE = 48;

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

// The shop's own photos of ready combinations: check them by flower, filler and palette, replace one that looks
// wrong, or remove it so customers get a generated preview for that combination again.
export const AdminCombinationPhotos = ({ photos, options, onToast }: AdminCombinationPhotosProps) => {
  const [search, setSearch] = useState("");
  const [paletteFilter, setPaletteFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [removing, setRemoving] = useState<CombinationPhoto | null>(null);

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
        <p className="admin-ui-panel-note">
          Showing {visibleCount} of {matching.length}.{" "}
          <button type="button" className="admin-ui-link-button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
            Show more
          </button>
        </p>
      ) : null}
      <p className="admin-ui-panel-note">
        These are the shop's own photos for Korean wrap with a satin ribbon. Customers see the one that matches their flowers, filler and
        palette; anything else is generated with AI. Replace a photo that doesn't look right, or remove it to go back to AI for that bouquet.
      </p>

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
