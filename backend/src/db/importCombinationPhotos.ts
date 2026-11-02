import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RowDataPacket } from "mysql2";
import { combinationKey, type CombinationSpec } from "../utils/combinationKey.js";

// Imports the shop's own combination photos (a folder tree like COMBINATIONS/PC + RR/PC + RR + ASTHER/SMALL 3 PCS)
// as the customizer preview for Korean wrap + satin ribbon, one photo per flowers + fillers + palette.
//
//   1. scripts/classify-combination-photos.ps1 -Root <folder> -Out manifest.json   (tags each photo's palette)
//   2. npm run combinations:import -- --manifest manifest.json                      (dry run: report + plan, no uploads)
//   3. npx tsx --env-file=../.env src/db/importCombinationPhotos.ts --manifest manifest.json --apply   (uploads, saves to the DB the .env points at)
//
// Uploads use one fixed public id per combination, and rows already saved with the same source file are skipped,
// so a failed run can simply be started again.

const CLOUDINARY_FOLDER = "pampanga-flower-shop/builder/combinations";
const MAX_AVERAGE_COST = 1.2;
const MIME_TYPES: Record<string, string> = { ".png": "image/png" };

const argValue = (name: string) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};
const isApply = process.argv.includes("--apply");
const manifestFile = argValue("--manifest");
const planFile = argValue("--plan") ?? "combinations-plan.json";

interface ManifestFile {
  path: string;
  rgb: number[] | null;
  error: string | null;
}

// What each folder name means. Colors are the names the builder offers for that flower.
const CARNATION_COLORS: Record<string, string> = { PC: "Pink", RC: "Red", WC: "White", YC: "Yellow" };
const SINGLE_FLOWERS: Array<{ pattern: RegExp; code: string; color: string }> = [
  { pattern: /RED GERBERA/i, code: "gerberas", color: "Red" },
  { pattern: /PINK GERBERA/i, code: "gerberas", color: "Pink" },
  { pattern: /YELLOW GERBERA/i, code: "gerberas", color: "Yellow" },
  { pattern: /PINK CARNATION/i, code: "carnations", color: "Pink" },
  { pattern: /RED CARNATION/i, code: "carnations", color: "Red" },
  { pattern: /YELLOW CARNATION/i, code: "carnations", color: "Yellow" },
  { pattern: /RED ROSE/i, code: "roses", color: "Red" },
  { pattern: /SUNFLOWER/i, code: "sunflowers", color: "Yellow" }
];
const FILLERS: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /aster|asthe/i, code: "asters" },
  { pattern: /\bbb\b|baby/i, code: "babys-breath" },
  { pattern: /\beu\b|euca/i, code: "eucalyptus" },
  { pattern: /\bsw\b|static/i, code: "statice-white" }
];
const PALETTES = ["red", "blush", "ivory", "purple", "blue", "black"];

// A folder holds one photo of each palette, so the six photos are matched to the six palettes together (every
// palette once) rather than one by one: lighting and shadows shift each photo's color, but not their order.
const hsvOf = ([red, green, blue]: readonly number[]) => {
  const [r, g, b] = [red / 255, green / 255, blue / 255];
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  let hue = 0;
  if (delta > 0) {
    hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  return { hue, sat: max === 0 ? 0 : delta / max, value: max };
};

const hueGap = (first: number, second: number) => {
  const gap = Math.abs(first - second) % 360;
  return Math.min(gap, 360 - gap);
};

// How unlike each palette a photo looks (0 = typical). Pink and red share a hue: blush is light, red is deep.
const paletteCost = (rgb: readonly number[], palette: string) => {
  const { hue, sat, value } = hsvOf(rgb);
  switch (palette) {
    case "blue":
      return hueGap(hue, 225) / 60 + (sat < 0.2 ? 2 : 0);
    case "purple":
      return hueGap(hue, 295) / 60 + (sat < 0.12 ? 2 : 0);
    case "blush":
      return hueGap(hue, 350) / 60 + Math.max(0, 0.9 - value) * 2 + (sat > 0.5 ? 1 : 0);
    case "red":
      return hueGap(hue, 355) / 60 + (value > 0.8 ? 1 : 0) + (sat < 0.4 ? 1.5 : 0);
    case "black":
      return value * 3 + sat;
    default:
      // ivory: pale and nearly colorless
      return sat * 3 + Math.max(0, 0.95 - value) * 1.5;
  }
};

// The cheapest way to give each photo its own palette, by trying every order (at most 6! = 720).
const assignPalettes = (photos: ManifestFile[]) => {
  let best: { palettes: string[]; cost: number } | null = null;
  const search = (index: number, used: string[], cost: number) => {
    if (best && cost >= best.cost) {
      return;
    }
    if (index === photos.length) {
      best = { palettes: used, cost };
      return;
    }
    for (const palette of PALETTES.filter((entry) => !used.includes(entry))) {
      // A photo without a measured color fits every palette equally; it ends up with whichever is left.
      const fit = photos[index].rgb ? paletteCost(photos[index].rgb, palette) : 0;
      search(index + 1, [...used, palette], cost + fit);
    }
  };
  search(0, [], 0);
  return best as { palettes: string[]; cost: number } | null;
};

const fillerOf = (text: string) => FILLERS.find(({ pattern }) => pattern.test(text))?.code;

interface Decoded {
  spec: CombinationSpec;
  // Set when the folder's own name and its parent folder name disagree about the filler (the leaf name wins).
  note?: string;
}

// The leaf folder (where the photos are) names the quantity and filler; the first folder names the flowers.
const decodeFolder = (segments: string[]): Decoded | string => {
  const top = segments[0].trim();
  const leaf = segments[segments.length - 2].trim();
  const quantity = Number(/(\d+)\s*pcs?/i.exec(leaf)?.[1]);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return `no quantity in "${leaf}"`;
  }

  let flowers: CombinationSpec["flowers"];
  const mixed = /^([A-Z]{2})\s*\+\s*RR$/i.exec(top);
  if (mixed) {
    const color = CARNATION_COLORS[mixed[1].toUpperCase()];
    if (!color) {
      return `unknown carnation code "${mixed[1]}"`;
    }
    // "3 PCS + PC + RR + ASTHER": three carnations plus one red rose.
    flowers = [{ code: "carnations", color, quantity }, { code: "roses", color: "Red", quantity: 1 }];
  } else {
    const single = SINGLE_FLOWERS.find(({ pattern }) => pattern.test(top));
    if (!single) {
      return `unknown flower in "${top}"`;
    }
    flowers = [{ code: single.code, color: single.color, quantity }];
  }

  // The filler comes from the folder that names it. In the single-flower tree that is the folder under the flower
  // ("YELLOW CARNATIONS - ASTHER"): its subfolders are sometimes mislabeled (the photos inside show the folder's
  // filler). In the mixed tree the leaf names it, and the folder above is only a container that isn't always right.
  // No filler named anywhere (the Yellow Gerbera folders) means a bouquet without filler flowers.
  const parentFiller = segments.slice(1, -1).map(fillerOf).filter(Boolean).pop();
  const leafFiller = fillerOf(leaf);
  const filler = (mixed ? leafFiller ?? parentFiller : fillerOf(segments[1]) ?? leafFiller) ?? undefined;
  const note = parentFiller && leafFiller && parentFiller !== leafFiller
    ? `folder says ${parentFiller}, leaf says ${leafFiller}; using ${filler}`
    : undefined;
  return { spec: { flowers, fillers: filler ? [filler] : [], palette: "" }, note };
};

interface PlanEntry {
  key: string;
  selection: CombinationSpec;
  path: string;
  palette: string;
  // Average palette-fit cost of the photo's folder (lower = clearer colors).
  cost: number;
  note?: string;
}

const describe = ({ flowers, fillers, palette }: CombinationSpec) =>
  `${flowers.map((flower) => `${flower.quantity} ${flower.color} ${flower.code}`).join(" + ")} + ${fillers.join(", ") || "no filler"} / ${palette}`;

const buildPlan = (files: ManifestFile[]) => {
  const issues: string[] = [];
  const candidates: PlanEntry[] = [];

  const byFolder = new Map<string, ManifestFile[]>();
  for (const file of files) {
    const folder = file.path.split("/").slice(0, -1).join("/");
    byFolder.set(folder, [...(byFolder.get(folder) ?? []), file]);
  }

  for (const [folder, photos] of byFolder) {
    const decoded = decodeFolder(photos[0].path.split("/"));
    if (typeof decoded === "string") {
      issues.push(`SKIPPED folder (${decoded}): ${folder}`);
      continue;
    }
    // Only folders of exactly six photos can be matched to the six palettes. One photo whose color couldn't be
    // measured takes the palette the other five leave over; two or more would be a guess.
    const unreadable = photos.filter((photo) => !photo.rgb);
    if (photos.length !== PALETTES.length || unreadable.length > 1) {
      issues.push(`SKIPPED folder (${photos.length} photos, ${unreadable.length} unmeasurable; needs ${PALETTES.length} with at most 1 unmeasurable): ${folder}`);
      continue;
    }
    if (unreadable.length === 1) {
      issues.push(`WARNING (palette of ${path.basename(unreadable[0].path)} inferred as the one left over): ${folder}`);
    }
    const assigned = assignPalettes(photos);
    if (!assigned) {
      continue;
    }
    // A folder whose photos fit the palettes badly is held back for a look instead of imported.
    const average = assigned.cost / photos.length;
    if (average > MAX_AVERAGE_COST) {
      issues.push(`SKIPPED folder (palettes unclear, cost ${average.toFixed(2)}): ${folder}`);
      continue;
    }
    photos.forEach((photo, index) => {
      const palette = assigned.palettes[index];
      const selection = { ...decoded.spec, palette };
      candidates.push({ key: combinationKey(selection), selection, path: photo.path, palette, cost: average, note: decoded.note });
    });
    if (decoded.note) {
      issues.push(`WARNING (${decoded.note}): ${folder}`);
    }
  }

  // Two photos for one combination: never guess which is right; a person decides.
  const byKey = new Map<string, PlanEntry[]>();
  candidates.forEach((entry) => byKey.set(entry.key, [...(byKey.get(entry.key) ?? []), entry]));
  const plan: PlanEntry[] = [];
  for (const entries of byKey.values()) {
    if (entries.length === 1) {
      plan.push(entries[0]);
    } else {
      issues.push(`CONFLICT, ${entries.length} photos for ${describe(entries[0].selection)}, none imported:\n    ${entries.map((entry) => entry.path).join("\n    ")}`);
    }
  }
  return { plan, issues };
};

// Every flower, color, filler and palette in the plan has to exist (and be available) in the builder before any upload.
const checkAgainstBuilder = async (plan: PlanEntry[]) => {
  const { loadBuilderOptions } = await import("./builder.js");
  const options = await loadBuilderOptions(false);
  const problems = new Set<string>();
  for (const { selection } of plan) {
    for (const { code, color } of selection.flowers) {
      const flower = options.find((option) => option.group === "flower" && option.code === code);
      if (!flower) {
        problems.add(`flower "${code}" is missing in the builder`);
      } else if (!flower.colorChoices.some((choice) => choice.name === color)) {
        problems.add(`${flower.name} has no "${color}" color in the builder`);
      }
    }
    for (const code of selection.fillers) {
      if (!options.some((option) => option.group === "filler" && option.code === code)) {
        problems.add(`filler "${code}" is missing (run the migrations first)`);
      }
    }
    if (!options.some((option) => option.group === "palette" && option.code === selection.palette)) {
      problems.add(`palette "${selection.palette}" is missing in the builder`);
    }
  }
  return [...problems];
};

interface SavedRow extends RowDataPacket {
  combination_key: string;
  source_path: string;
}

const uploadPlan = async (root: string, plan: PlanEntry[]) => {
  // Loaded only now: the dry run needs no database or Cloudinary settings.
  const { isCloudinaryConfigured, uploadImage } = await import("../services/cloudinary.js");
  const { pool } = await import("./pool.js");
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured (CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET)");
  }
  const problems = await checkAgainstBuilder(plan);
  if (problems.length > 0) {
    throw new Error(`The builder can't take every photo yet:\n  - ${problems.join("\n  - ")}`);
  }

  const [saved] = await pool.query<SavedRow[]>("SELECT combination_key, source_path FROM builder_combination_photos");
  const done = new Map(saved.map((row) => [row.combination_key, row.source_path]));
  const todo = plan.filter((entry) => done.get(entry.key) !== entry.path);
  console.log(`${plan.length - todo.length} already imported, uploading ${todo.length}`);

  let uploaded = 0;
  const failed: string[] = [];
  for (let index = 0; index < todo.length; index += 4) {
    await Promise.all(
      todo.slice(index, index + 4).map(async (entry) => {
        try {
          const data = await readFile(path.join(root, ...entry.path.split("/")));
          const mimeType = MIME_TYPES[path.extname(entry.path).toLowerCase()] ?? "image/jpeg";
          // replace: a photo that was swapped in the folder replaces the old upload under the same id.
          const { url } = await uploadImage(data, mimeType, { publicId: `${CLOUDINARY_FOLDER}/${entry.key}`, replace: true });
          await pool.query(
            `INSERT INTO builder_combination_photos (combination_key, selection, image_url, source_path)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE selection = VALUES(selection), image_url = VALUES(image_url), source_path = VALUES(source_path)`,
            [entry.key, JSON.stringify(entry.selection), url, entry.path]
          );
          uploaded += 1;
        } catch (error) {
          failed.push(`${entry.path}: ${error instanceof Error ? error.message : String(error)}`);
        }
      })
    );
    console.log(`  ${Math.min(index + 4, todo.length)}/${todo.length}`);
  }
  console.log(`Uploaded ${uploaded}, failed ${failed.length}`);
  failed.forEach((line) => console.log(`  FAILED ${line}`));
};

const run = async () => {
  if (!manifestFile) {
    throw new Error("Pass --manifest <file> (made by scripts/classify-combination-photos.ps1)");
  }
  // PowerShell writes the manifest with a byte-order mark.
  const manifest = JSON.parse((await readFile(manifestFile, "utf8")).replace(/^﻿/, "")) as { root: string; files: ManifestFile[] };
  const { plan, issues } = buildPlan(manifest.files);

  console.log(`${manifest.files.length} photos in ${new Set(manifest.files.map((file) => file.path.split("/").slice(0, -1).join("/"))).size} folders`);
  console.log(`${plan.length} combinations ready to import`);
  const perPalette = PALETTES.map((palette) => `${palette} ${plan.filter((entry) => entry.palette === palette).length}`).join(", ");
  console.log(`  by palette: ${perPalette}`);
  console.log(`${issues.length} issues:`);
  issues.forEach((issue) => console.log(`  - ${issue}`));

  await writeFile(planFile, JSON.stringify({ root: manifest.root, plan, issues }, null, 2));
  console.log(`Plan written to ${planFile}`);

  if (!isApply) {
    console.log("Dry run: nothing uploaded. Re-run with --apply to upload and save.");
    return;
  }
  await uploadPlan(manifest.root, plan);
};

try {
  await run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (isApply) {
    await (await import("./pool.js")).pool.end();
  }
}
