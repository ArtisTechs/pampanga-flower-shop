import { Router } from "express";
import { requireAdmin } from "../../middleware/auth.js";
import { adminContentRouter } from "./content.js";
import { adminDashboardRouter } from "./dashboard.js";
import { adminInventoryRouter } from "./inventory.js";
import { adminOrdersRouter } from "./orders.js";
import { adminProductsRouter } from "./products.js";
import { adminReportsRouter } from "./reports.js";
import { adminUsersRouter } from "./users.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);
adminRouter.use(adminDashboardRouter);
adminRouter.use(adminOrdersRouter);
adminRouter.use(adminProductsRouter);
adminRouter.use(adminReportsRouter);
adminRouter.use(adminInventoryRouter);
adminRouter.use(adminUsersRouter);
adminRouter.use(adminContentRouter);
