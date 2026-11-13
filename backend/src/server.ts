
import "dotenv/config";
import Fastify from "fastify";
import { prisma } from "./db.js";
import { webhookRoutes } from "./webhook.js";
import { orderRoutes } from "./order-routes.js";
import { productRoutes } from "./product-routes.js";
import cors from "@fastify/cors";

const app = Fastify({ logger: true });

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
await app.register(webhookRoutes);
await app.register(productRoutes);
await app.register(orderRoutes);

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: "0.0.0.0" });
