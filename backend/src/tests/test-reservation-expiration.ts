
import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../config/db.js";
import { createOrderFromComment } from "../services/order-service.js";
import { expireReservations } from "../services/reservation-expiration-service.js";

const suffix = Date.now().toString();
const productCode = `EXP${suffix}`;
const sourceCommentId = `test-expiration-${suffix}`;
const customerFbId = `test-customer-${suffix}`;

let productId: string | undefined;
let orderId: string | undefined;

try {
  // 0. Sécurité : ne pas lancer le traitement global
  // si d'autres réservations sont déjà expirées.
  const existingExpiredOrders = await prisma.order.count({
    where: {
      status: "PENDING",
      reservationExpiresAt: { lte: new Date() },
      stockReleasedAt: null,
    },
  });

  assert.equal(
    existingExpiredOrders,
    0,
    "Test interrompu : des réservations déjà expirées existent. Traitez-les avant de lancer ce test.",
  );

  // 1. Créer un produit temporaire avec une variante.
  const product = await prisma.product.create({
    data: {
      code: productCode,
      name: "Produit test expiration",
      price: 1000,
      stock: 0,
      hasVariants: true,
      variants: {
        create: {
          combinationKey: "M-NOIR",
          size: "M",
          color: "NOIR",
          stock: 5,
        },
      },
    },
    include: { variants: true },
  });

  productId = product.id;
  assert.equal(product.variants[0].stock, 5);

  // 2. Créer une réservation d'une unité.
  const result = await createOrderFromComment({
    productCode,
    quantity: 1,
    size: "M",
    color: "NOIR",
    customerFbId,
    customerName: "Test expiration",
    sourceCommentId,
  });

  if (!result.success || !result.order) {
    throw new Error(`Création échouée : ${result.message}`);
  }

  orderId = result.order.id;

  // 3. Vérifier la déduction du stock.
  let variant = await prisma.productVariant.findUnique({
    where: { id: product.variants[0].id },
  });

  assert.equal(variant?.stock, 4);

  // 4. Rendre la réservation expirée.
  await prisma.order.update({
    where: { id: orderId },
    data: {
      reservationExpiresAt: new Date(Date.now() - 60_000),
    },
  });

  // 5. Vérifier qu'il n'existe toujours qu'une réservation expirée.
  const expiredOrdersBeforeRun = await prisma.order.count({
    where: {
      status: "PENDING",
      reservationExpiresAt: { lte: new Date() },
      stockReleasedAt: null,
    },
  });

  assert.equal(
    expiredOrdersBeforeRun,
    1,
    "Test interrompu : le nombre de réservations expirées a changé.",
  );

  // 6. Exécuter le service d'expiration.
  const expiredCount = await expireReservations();
  assert.equal(expiredCount, 1);

  const expiredOrder = await prisma.order.findUnique({
    where: { id: orderId },
  });

  assert.equal(expiredOrder?.status, "CANCELLED");
  assert.ok(expiredOrder?.stockReleasedAt);

  // 7. Vérifier la restitution du stock.
  variant = await prisma.productVariant.findUnique({
    where: { id: product.variants[0].id },
  });

  assert.equal(variant?.stock, 5);

  // 8. Vérifier l'absence de double restitution.
  const secondRun = await expireReservations();
  assert.equal(secondRun, 0);

  variant = await prisma.productVariant.findUnique({
    where: { id: product.variants[0].id },
  });

  assert.equal(variant?.stock, 5);

  const movements = await prisma.stockMovement.count({
    where: {
      orderId,
      type: "RELEASE",
    },
  });

  assert.equal(movements, 1);

  console.log("OK : réservation créée.");
  console.log("OK : stock diminué de 5 à 4.");
  console.log("OK : réservation expirée et annulée.");
  console.log("OK : stock restitué de 4 à 5.");
  console.log("OK : aucune double restitution.");
} finally {
  // Supprimer uniquement les données créées par ce test.
  if (orderId) {
    await prisma.stockMovement.deleteMany({
      where: { orderId },
    });

    await prisma.order.deleteMany({
      where: { id: orderId },
    });
  }

  if (productId) {
    await prisma.stockMovement.deleteMany({
      where: { productId },
    });

    await prisma.productVariant.deleteMany({
      where: { productId },
    });

    await prisma.product.deleteMany({
      where: { id: productId },
    });
  }

  await prisma.customer.deleteMany({
    where: { fbUserId: customerFbId },
  });

  await prisma.$disconnect();
}
