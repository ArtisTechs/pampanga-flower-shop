import { runMigrations } from "./runMigrations.js";

runMigrations().catch((error: unknown) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
