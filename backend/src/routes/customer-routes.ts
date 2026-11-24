
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  getCustomers,
  getCustomerById,
} from "../services/customer-service.js";

const customerParamsSchema = z.object({
  id: z.string().min(1, "Identifiant client invalide."),
});

export const customerRoutes: FastifyPluginAsync = async (app) => {
  // Liste des clients
  app.get("/customers", async () => {
    const customers = await getCustomers();

    return {
      success: true,
      count: customers.length,
      customers,
    };
  });

  // Détail d'un client
  app.get<{ Params: { id: string } }>(
    "/customers/:id",
    async (request, reply) => {
      const parsed = customerParamsSchema.safeParse(request.params);

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: "Identifiant client invalide.",
        });
      }

      const customer = await getCustomerById(parsed.data.id);

      if (!customer) {
        return reply.code(404).send({
          success: false,
          message: "Client introuvable.",
        });
      }

      return {
        success: true,
        customer,
      };
    }
  );
};
