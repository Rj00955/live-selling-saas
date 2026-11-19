
import "dotenv/config";
import Fastify from "fastify";
import { prisma } from "./config/db.js";
import { webhookRoutes } from "./webhooks/webhook.js";
import { orderRoutes } from "./routes/order-routes.js";
import { productRoutes } from "./routes/product-routes.js";
import cors from "@fastify/cors";
import { startReservationExpirationJob } from "./services/reservation-expiration-service.js";
import { customerRoutes } from "./routes/customer-routes.js";

const app = Fastify({ logger: true });

const stopReservationExpirationJob =

  startReservationExpirationJob();

app.addHook("onClose", async () => {
  stopReservationExpirationJob();
});


await app.register(cors, {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
});

app.get("/health", async () => ({ status: "ok" }));

app.get("/health/db", async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { database: "ok" };
});

// Enregistrement des routes
// Enregistrement des routes
await app.register(webhookRoutes);
await app.register(productRoutes);
await app.register(orderRoutes);
await app.register(customerRoutes);

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: "0.0.0.0" });
