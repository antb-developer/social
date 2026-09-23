import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import { customerProfileRoutes } from "./routes/customerProfileRoutes";
import { devAuthRoutes } from "./routes/devAuthRoutes";
import { orderRoutes } from "./routes/orderRoutes";
import { pushRoutes } from "./routes/pushRoutes";
import { sellerMemberRoutes } from "./routes/sellerMemberRoutes";
import { sellerOrderRoutes } from "./routes/sellerOrderRoutes";
import { sellerProductRoutes } from "./routes/sellerProductRoutes";
import { sellerSettingsRoutes } from "./routes/sellerSettingsRoutes";
import { sellerSignupRoutes } from "./routes/sellerSignupRoutes";
import { sellerTemplateRoutes } from "./routes/sellerTemplateRoutes";
import { storeRoutes } from "./routes/storeRoutes";
import { superadminRoutes } from "./routes/superadminRoutes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/stores", storeRoutes);
  app.use("/api/push", pushRoutes);
  app.use("/api/dev", devAuthRoutes);
  app.use("/api/me", customerProfileRoutes);
  app.use("/api", orderRoutes);
  app.use("/api/seller/products", sellerProductRoutes);
  app.use("/api/seller/templates", sellerTemplateRoutes);
  app.use("/api/seller/settings", sellerSettingsRoutes);
  app.use("/api/seller/members", sellerMemberRoutes);
  app.use("/api/seller/signup", sellerSignupRoutes);
  app.use("/api/seller", sellerOrderRoutes);
  app.use("/api/superadmin", superadminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
