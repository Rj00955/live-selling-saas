import "dotenv/config";
import Fastify from "fastify";
import { prisma } from "./db.js";
import { webhookRoutes } from "./webhook.js";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));

app.get("/health/db", async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { database: "ok" };
});

await app.register(webhookRoutes);

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: "0.0.0.0" });