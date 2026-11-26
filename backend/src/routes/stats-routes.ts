import type { FastifyPluginAsync } from "fastify";
import { getDashboardStats } from "../services/stats-service.js";

export const statsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/stats", async () => {
    return {
      success: true,
      stats: await getDashboardStats(),
    };
  });
};