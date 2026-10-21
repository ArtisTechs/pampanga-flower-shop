import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createScriptConnection } from "./pool.js";

const seedsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/seeds");

// Seeds use INSERT IGNORE, so re-running only adds missing rows.
const seed = async () => {
  const connection = await createScriptConnection();

  try {
    const files = (await readdir(seedsDir)).filter((file) => file.endsWith(".sql")).sort();

    for (const file of files) {
      await connection.query(await readFile(path.join(seedsDir, file), "utf8"));
      console.log(`Applied seed ${file}`);
    }
  } finally {
    await connection.end();
  }
};

seed().catch((error: unknown) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
