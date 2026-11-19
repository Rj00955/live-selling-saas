
import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../config/db.js";
import { createOrderFromComment, confirmOrder } from "../services/order-service.js";
import { expireReservations } from "../services/reservation-expiration-service.js";

async function main() {
  const suffix = Date.now().toString();
  const productCode = `RACE${suffix}`;
  const sourceCommentId = `TEST_RACE_${suffix}`;
  const customerFbId = `TEST_RACE_CUSTOMER_${suffix}`;

  let productId: string | undefined;
  let orderId: string | undefined;

  try {
    // 1. Créer un produit avec 5 unités
    const product = await prisma.product.create({
      data: {
        code: productCode,
        name: "Test concurrence confirmation expiration",
        price: 10000,
        stock: 5,
      },
    });

    productId = product.id;

    // 2. Créer une réservation
    const result = await createOrderFromComment({
      productCode,
      quantity: 1,
      customerFbId,
      customerName: "Client test concurrence",
      sourceCommentId,
    });

    assert.equal(result.success, true, "La réservation doit être créée.");

    if (!result.success || !result.order) {
      throw new Error("Impossible de créer la réservation de test.");
    }

    orderId = result.order.id;

    // 3. Forcer son expiration
    await prisma.order.update({
      where: { id: orderId },
      data: {
        reservationExpiresAt: new Date(Date.now() - 1000),
      },
    });

    console.log("Réservation créée puis expirée.");

    // 4. Lancer confirmation et expiration simultanément
    const results = await Promise.all([
      confirmOrder(orderId),
      expireReservations(),
    ]);

    console.log("Résultat confirmation :", results[0]);
    console.log("Nombre de réservations expirées :", results[1]);

    // 5. Vérifier l'état final
    const finalOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    const finalProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    const releaseCount = await prisma.stockMovement.count({
      where: {
        orderId,
        type: "RELEASE",
      },
    });

    console.log("Statut final :", finalOrder?.status);
    console.log("Stock final :", finalProduct?.stock);
    console.log("Mouvements RELEASE :", releaseCount);

    assert.ok(
      finalOrder?.status === "CANCELLED" ||
        finalOrder?.status === "CONFIRMED",
      "La commande doit avoir un état final valide.",
    );

    if (finalOrder?.status === "CANCELLED") {
      assert.ok(finalOrder.stockReleasedAt);
      assert.equal(finalProduct?.stock, 5);
      assert.equal(releaseCount, 1);
    }

    if (finalOrder?.status === "CONFIRMED") {
      assert.equal(finalOrder.stockReleasedAt, null);
      assert.equal(finalProduct?.stock, 4);
      assert.equal(releaseCount, 0);
    }

    assert.ok(
      (finalProduct?.stock ?? -1) >= 0,
      "Le stock ne doit pas être négatif.",
    );

    console.log("SUCCÈS : concurrence confirmation / expiration vérifiée.");
  } finally {
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

      await prisma.product.deleteMany({
        where: { id: productId },
      });
    }

    await prisma.customer.deleteMany({
      where: { fbUserId: customerFbId },
    });
  }
}

main()
  .catch((error) => {
    console.error("ÉCHEC DU TEST :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
