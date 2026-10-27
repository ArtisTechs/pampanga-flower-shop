import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { runMigrations } from "./db/runMigrations.js";
import { cancelUnpaidOrders } from "./db/stock.js";
import { isEmailConfigured } from "./services/email.js";

// Hosts that only run `npm start` (e.g. Render) still get new tables on each deploy.
// A failure is logged and the API starts anyway, so /api/health can report the database state.
if (config.autoMigrate) {
  try {
    await runMigrations();
  } catch (error) {
    console.error("Migration on startup failed:", error instanceof Error ? error.message : error);
  }
}

const server = app.listen(config.port, () => {
  console.log(`API listening on port ${config.port} (${config.nodeEnv})`);
  if (!isEmailConfigured()) {
    console.warn("BREVO_API_KEY or MAIL_FROM_EMAIL is not set: sign-up and password reset codes can't be emailed");
  }
});

// Unpaid orders are checked on start and every 10 minutes after.
const UNPAID_CHECK_MS = 10 * 60 * 1000;
const checkUnpaidOrders = async () => {
  try {
    const cancelled = await cancelUnpaidOrders(config.unpaidOrderCancelHours);
    if (cancelled > 0) {
      console.log(`Cancelled ${cancelled} unpaid order(s) and returned their stock`);
    }
  } catch (error) {
    console.error("Unpaid order check failed:", error instanceof Error ? error.message : error);
  }
};
const unpaidTimer = config.unpaidOrderCancelHours > 0 ? setInterval(() => void checkUnpaidOrders(), UNPAID_CHECK_MS) : null;
if (unpaidTimer) {
  void checkUnpaidOrders();
}

const shutdown = () => {
  if (unpaidTimer) {
    clearInterval(unpaidTimer);
  }
  server.close(() => {
    void pool.end().finally(() => process.exit(0));
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
