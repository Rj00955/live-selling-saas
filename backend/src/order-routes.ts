
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "./db.js";
import { confirmOrder, cancelOrder } from "./order-service.js";

const orderParamsSchema = z.object({
  id: z.string().min(1, "Identifiant de commande invalide."),
});

export const orderRoutes: FastifyPluginAsync = async (app) => {
  // Ces routes sont réservées aux tests locaux tant que
  // l'authentification des vendeurs n'est pas implémentée.
  app.addHook("preHandler", async (_request, reply) => {
    const enabled =
      process.env.NODE_ENV !== "production" &&
      process.env.ENABLE_DEV_ORDER_ROUTES === "true";

    if (!enabled) {
      return reply.code(403).send({
        success: false,
        message: "Routes de commandes désactivées.",
      });
    }
  });

  // Consulter les commandes
  app.get("/orders", async () => {
    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: {
          select: {
            code: true,
            name: true,
            price: true,
          },
        },
      },
    });

    return {
      success: true,
      count: orders.length,
      orders,
    };
  });

  // Confirmer une commande
  app.patch<{ Params: { id: string } }>(
    "/orders/:id/confirm",
    async (request, reply) => {
      const parsed = orderParamsSchema.safeParse(request.params);

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: "Identifiant de commande invalide.",
        });
      }

      const result = await confirmOrder(parsed.data.id);

      if (!result.success) {
        const statusCode =
          result.message === "Commande introuvable." ? 404 : 409;

        return reply.code(statusCode).send(result);
      }

      return reply.code(200).send(result);
    }
  );

  // Annuler une commande
  app.patch<{ Params: { id: string } }>(
    "/orders/:id/cancel",
    async (request, reply) => {
      const parsed = orderParamsSchema.safeParse(request.params);

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: "Identifiant de commande invalide.",
        });
      }

      const result = await cancelOrder(parsed.data.id);

      if (!result.success) {
        const statusCode =
          result.message === "Commande introuvable." ? 404 : 409;

        return reply.code(statusCode).send(result);
      }

      return reply.code(200).send(result);
    }
  );
};
