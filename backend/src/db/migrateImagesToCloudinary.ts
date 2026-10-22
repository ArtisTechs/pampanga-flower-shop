import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { isCloudinaryConfigured, uploadImage } from "../services/cloudinary.js";
import { pool } from "./pool.js";

// One-time move of the seeded flower images (products, home cards, customizer previews) from
// frontend/public/images to Cloudinary. Uploads use fixed public ids, so re-running is safe.
// Then rewrites the DB columns and the seed files to the returned Cloudinary URLs.
//
// Docker: docker compose run --rm -v ./frontend/public:/frontend-public:ro -e FRONTEND_PUBLIC_DIR=/frontend-public backend npm run images:migrate [-- --dry-run]

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = process.env.FRONTEND_PUBLIC_DIR ?? path.resolve(here, "../../../frontend/public");
const seedsDir = path.resolve(here, "../../db/seeds");
const mapFile = path.resolve(here, "../../.cloudinary-image-map.json");
const CLOUDINARY_ROOT = "pampanga-flower-shop/catalog";
const LOCAL_PATH = /'(images\/(?:products|categories|customize-previews)\/[A-Za-z0-9/_.-]+\.(?:jpe?g|png|webp))'/g;
const IMAGE_COLUMNS = [
  { table: "products", column: "image_path" },
  { table: "categories", column: "card_image_path" },
  { table: "builder_previews", column: "image_path" }
] as const;
const MIME_TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const isDryRun = process.argv.includes("--dry-run");

const collectLocalPaths = async () => {
  const paths = new Set<string>();
  for (const { table, column } of IMAGE_COLUMNS) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT ${column} AS image FROM ${table} WHERE ${column} LIKE 'images/%'`
    );
    rows.forEach((row) => paths.add(row.image as string));
  }
  for (const file of (await readdir(seedsDir)).filter((name) => name.endsWith(".sql"))) {
    const sql = await readFile(path.join(seedsDir, file), "utf8");
    for (const match of sql.matchAll(LOCAL_PATH)) {
      paths.add(match[1]);
    }
  }
  return [...paths].sort();
};

const publicIdFor = (localPath: string) =>
  `${CLOUDINARY_ROOT}/${localPath.replace(/^images\//, "").replace(/\.[^.]+$/, "")}`;

const migrate = async () => {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured (CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET)");
  }

  const localPaths = await collectLocalPaths();
  console.log(`${localPaths.length} local images referenced by the DB and seeds (public dir: ${publicDir})`);

  // Read every file first so a missing one aborts before anything changes.
  const files = await Promise.all(
    localPaths.map(async (localPath) => ({ localPath, data: await readFile(path.join(publicDir, localPath)) }))
  );
  if (isDryRun) {
    files.forEach(({ localPath, data }) => console.log(`  would upload ${localPath} (${data.length} bytes) -> ${publicIdFor(localPath)}`));
    return;
  }

  const urlByPath = new Map<string, string>();
  for (let index = 0; index < files.length; index += 4) {
    await Promise.all(
      files.slice(index, index + 4).map(async ({ localPath, data }) => {
        const mimeType = MIME_TYPES[path.extname(localPath).toLowerCase()];
        const { url } = await uploadImage(data, mimeType, { publicId: publicIdFor(localPath) });
        const check = await fetch(url, { method: "HEAD" });
        if (!check.ok) {
          throw new Error(`Uploaded image is not reachable (${check.status}): ${url}`);
        }
        urlByPath.set(localPath, url);
        console.log(`  uploaded ${localPath}`);
      })
    );
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    let updatedRows = 0;
    for (const [localPath, url] of urlByPath) {
      for (const { table, column } of IMAGE_COLUMNS) {
        const [result] = await connection.query<ResultSetHeader>(
          `UPDATE ${table} SET ${column} = ? WHERE ${column} = ?`,
          [url, localPath]
        );
        updatedRows += result.affectedRows;
      }
    }
    await connection.commit();
    console.log(`Updated ${updatedRows} database rows`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  for (const file of (await readdir(seedsDir)).filter((name) => name.endsWith(".sql"))) {
    const seedPath = path.join(seedsDir, file);
    const sql = await readFile(seedPath, "utf8");
    const rewritten = sql.replace(LOCAL_PATH, (match, localPath: string) =>
      urlByPath.has(localPath) ? `'${urlByPath.get(localPath)}'` : match
    );
    if (rewritten !== sql) {
      await writeFile(seedPath, rewritten);
      console.log(`Rewrote seed ${file}`);
    }
  }

  await writeFile(mapFile, `${JSON.stringify(Object.fromEntries(urlByPath), null, 2)}\n`);
  console.log(`Done: ${urlByPath.size} images on Cloudinary. Map written to ${path.basename(mapFile)}`);
};

migrate()
  .catch((error: unknown) => {
    console.error("Image migration failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
