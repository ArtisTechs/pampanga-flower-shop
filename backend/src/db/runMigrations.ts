import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RowDataPacket } from "mysql2";
import { createScriptConnection } from "./pool.js";

// Resolves to backend/db/migrations from both src/db (tsx) and dist/db (compiled).
const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations");

// Forward-only runner: applies each pending *.up.sql once, in filename order.
// Rollbacks (*.down.sql) are destructive and must be run manually with approval.
// Used by `npm run migrate` and on server start; a lock keeps two processes from migrating at once.
export const runMigrations = async () => {
  const connection = await createScriptConnection();

  try {
    const [[lock]] = await connection.query<RowDataPacket[]>("SELECT GET_LOCK('schema_migrations', 60) AS acquired");
    if (lock?.acquired !== 1) {
      throw new Error("Another process is running migrations");
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [rows] = await connection.query<RowDataPacket[]>("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((row) => row.name as string));
    const pending = (await readdir(migrationsDir))
      .filter((file) => file.endsWith(".up.sql") && !applied.has(file))
      .sort();

    for (const file of pending) {
      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      // MySQL DDL auto-commits, so a failed migration may be partially applied; it is not recorded and will retry.
      await connection.query(sql);
      await connection.query("INSERT INTO schema_migrations (name) VALUES (?)", [file]);
      console.log(`Applied migration ${file}`);
    }

    if (pending.length === 0) {
      console.log("No pending migrations");
    }
  } finally {
    // Closing the connection also releases the lock.
    await connection.end();
  }
};
