import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { accountRouter } from "./routes/account.js";
import { adminRouter } from "./routes/admin/index.js";
import { authRouter } from "./routes/auth.js";
import { builderRouter } from "./routes/builder.js";
import { catalogRouter } from "./routes/catalog.js";
import { contentRouter } from "./routes/content.js";
import { healthRouter } from "./routes/health.js";
import { ordersRouter } from "./routes/orders.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "100kb" }));

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/account", accountRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);
app.use("/api", catalogRouter);
app.use("/api", contentRouter);
app.use("/api", builderRouter);

app.use(notFound);
app.use(errorHandler);
