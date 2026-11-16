
import "dotenv/config";
import Fastify from "fastify";
import crypto from "node:crypto";
import { prisma } from "./db.js";
import { webhookRoutes } from "./webhook.js";
import { cancelOrder } from "./order-service.js";

const app = Fastify({ logger: true });

async function main() {
  await app.register(webhookRoutes);
  await app.ready();

  const commentId = `TEST_WEBHOOK_${Date.now()}`;

  const payload = {
    object: "page",
    entry: [
      {
        changes: [
          {
            field: "feed",
            value: {
              item: "comment",
              verb: "add",
              comment_id: commentId,
              message: "HAKA 2 TSTV1 M NOIR",
              from: {
                id: "TEST_CUSTOMER_001",
                name: "Client Test",
              },
            },
          },
        ],
      },
    ],
  };

  const rawBody = JSON.stringify(payload);

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (process.env.META_APP_SECRET) {
    headers["x-hub-signature-256"] =
      "sha256=" +
      crypto
        .createHmac("sha256", process.env.META_APP_SECRET)
        .update(rawBody)
        .digest("hex");
  }

  const initialVariant = await prisma.productVariant.findFirst({
    where: {
      product: { code: "TSTV1" },
      size: "M",
      color: "NOIR",
    },
  });

  if (!initialVariant || initialVariant.stock !== 5) {
    throw new Error(
      `Stock initial incorrect : ${initialVariant?.stock ?? "variante introuvable"}. Attendu : 5.`,
    );
  }

  console.log("Stock initial M/NOIR :", initialVariant.stock);

  const response = await app.inject({
    method: "POST",
    url: "/webhook",
    headers,
    payload: rawBody,
  });

  console.log("Réponse webhook :", response.statusCode, response.body);

  if (response.statusCode !== 200) {
    throw new Error("Le webhook a échoué.");
  }

  const order = await prisma.order.findUnique({
    where: { sourceCommentId: commentId },
  });

  if (!order) {
    throw new Error("Aucune commande créée par le webhook.");
  }

  console.log("Commande créée :", order.id);
  console.log("Quantité :", order.quantity);
  console.log("Statut :", order.status);

  const afterReservation = await prisma.productVariant.findUnique({
    where: { id: initialVariant.id },
  });

  console.log("Stock après réservation :", afterReservation?.stock);

  if (afterReservation?.stock !== 3 || order.quantity !== 2) {
    throw new Error("La réservation du stock est incorrecte.");
  }

  const cancellation = await cancelOrder(order.id);

  if (!cancellation.success) {
    throw new Error("Impossible d'annuler la commande de test.");
  }

  const afterCancellation = await prisma.productVariant.findUnique({
    where: { id: initialVariant.id },
  });

  console.log("Stock après annulation :", afterCancellation?.stock);

  if (afterCancellation?.stock !== 5) {
    throw new Error("La restauration du stock est incorrecte.");
  }

  console.log("TOUS LES TESTS WEBHOOK SONT RÉUSSIS !");
}

main()
  .catch((error) => {
    console.error("ÉCHEC DU TEST :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await app.close();
    await prisma.$disconnect();
  });
