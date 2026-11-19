
import "dotenv/config";
import Fastify from "fastify";
import crypto from "node:crypto";
import { prisma } from "../config/db.js";
import { webhookRoutes } from "../webhooks/webhook.js";
import {
  createProduct,
  deleteProduct,
} from "../services/product-service.js";
import { cancelOrder } from "../services/order-service.js";

const app = Fastify({ logger: true });

const suffix = Date.now().toString();
const productCode = `WHT${suffix}`;
const commentId = `TEST_WEBHOOK_${suffix}`;
const customerFbId = `TEST_CUSTOMER_${suffix}`;

let productId: string | null = null;

async function cleanup() {
  console.log("Nettoyage des données de test...");

  if (productId) {
    await prisma.$transaction(async (tx) => {
      await tx.waitlistEntry.deleteMany({
        where: { productId: productId! },
      });

      await tx.stockMovement.deleteMany({
        where: { productId: productId! },
      });

      await tx.order.deleteMany({
        where: { productId: productId! },
      });

      await tx.comment.deleteMany({
        where: { fbCommentId: commentId },
      });
    });

    await deleteProduct(productId);
  } else {
    await prisma.comment.deleteMany({
      where: { fbCommentId: commentId },
    });
  }

  const customer = await prisma.customer.findUnique({
    where: { fbUserId: customerFbId },
  });

  if (customer) {
    const [orders, comments] = await Promise.all([
      prisma.order.count({
        where: { customerId: customer.id },
      }),
      prisma.comment.count({
        where: { customerId: customer.id },
      }),
    ]);

    if (orders === 0 && comments === 0) {
      await prisma.customer.delete({
        where: { id: customer.id },
      });
    }
  }

  console.log("Nettoyage terminé.");
}

async function main() {
  const appSecret = process.env.META_APP_SECRET;

  if (!appSecret) {
    throw new Error("META_APP_SECRET n'est pas configuré.");
  }

  const product = await createProduct({
    code: productCode,
    name: "Produit temporaire test webhook",
    price: 10000,
    stock: 0,
    hasVariants: true,
    variants: [
      {
        size: "M",
        color: "NOIR",
        stock: 5,
      },
    ],
  });

  productId = product.id;

  const variant = product.variants[0];

  if (!variant || variant.stock !== 5) {
    throw new Error("Création du produit de test incorrecte.");
  }

  console.log("Produit temporaire créé :", productCode);
  console.log("Stock initial :", variant.stock);

  await app.register(webhookRoutes);
  await app.ready();

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
              message: `HAKA 2 ${productCode} M NOIR`,
              from: {
                id: customerFbId,
                name: "Client Test Webhook",
              },
            },
          },
        ],
      },
    ],
  };

  const rawBody = JSON.stringify(payload);

  const signature =
    "sha256=" +
    crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex");

  const response = await app.inject({
    method: "POST",
    url: "/webhook",
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": signature,
    },
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
    where: { id: variant.id },
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
    where: { id: variant.id },
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
    try {
      await cleanup();
    } catch (error) {
      console.error("ERREUR DE NETTOYAGE :", error);
      process.exitCode = 1;
    }

    await app.close();
    await prisma.$disconnect();
  });
