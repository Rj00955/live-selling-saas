import "dotenv/config";
import Fastify from "fastify";
import { prisma } from "./config/db.js";
import { webhookRoutes } from "./webhooks/webhook.js";
import { orderRoutes } from "./routes/order-routes.js";
import { productRoutes } from "./routes/product-routes.js";
import { statsRoutes } from "./routes/stats-routes.js";
import cors from "@fastify/cors";
import { startReservationExpirationJob } from "./services/reservation-expiration-service.js";
import { customerRoutes } from "./routes/customer-routes.js";
import { registerAuth, authenticate } from "./auth/auth-guard.js";
import { enforceAccess } from "./auth/access-policy.js";
import { authRoutes } from "./routes/auth-routes.js";

const app = Fastify({ logger: true });

const stopReservationExpirationJob =

  startReservationExpirationJob();

app.addHook("onClose", async () => {
  stopReservationExpirationJob();
});


await app.register(cors, {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
});

// Cookies + JWT (doit être enregistré avant les routes)
await registerAuth(app);

app.get("/health", async () => ({ status: "ok" }));

app.get("/health/db", async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { database: "ok" };
});

// Routes publiques
await app.register(webhookRoutes);
await app.register(authRoutes);

// Routes protégées : connexion obligatoire, puis contrôle du rôle (matrice d'accès)
await app.register(async (protectedApp) => {
  protectedApp.addHook("onRequest", authenticate);
  protectedApp.addHook("onRequest", enforceAccess);

  await protectedApp.register(productRoutes);
  await protectedApp.register(orderRoutes);
  await protectedApp.register(customerRoutes);
  await protectedApp.register(statsRoutes);
});

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: "0.0.0.0" });