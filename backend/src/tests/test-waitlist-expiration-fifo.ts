
import assert from "node:assert/strict";
import { prisma } from "../config/db.js";
import { createOrderFromComment } from "../services/order-service.js";
import { expireReservations } from "../services/reservation-expiration-service.js";

async function main() {
  const suffix = Date.now().toString();
  const productCode = `FIFO${suffix}`;
  const fbIds = [
    `FIFO_CUSTOMER_1_${suffix}`,
    `FIFO_CUSTOMER_2_${suffix}`,
    `FIFO_CUSTOMER_3_${suffix}`,
  ];
  const commentIds = [
    `FIFO_COMMENT_1_${suffix}`,
    `FIFO_COMMENT_2_${suffix}`,
    `FIFO_COMMENT_3_${suffix}`,
  ];

  let productId: string | undefined;
  let firstOrderId: string | undefined;

  try {
    // Créer les trois clients et leurs commentaires.
    const customers = await Promise.all(
      fbIds.map((fbUserId, index) =>
        prisma.customer.create({
          data: {
            fbUserId,
            name: `Client FIFO ${index + 1}`,
          },
        }),
      ),
    );

    await Promise.all(
      commentIds.map((fbCommentId, index) =>
        prisma.comment.create({
          data: {
            fbCommentId,
            fbUserId: fbIds[index],
            userName: `Client FIFO ${index + 1}`,
            message: `Je prends ${productCode}`,
            customerId: customers[index].id,
          },
        }),
      ),
    );

    // Créer un produit avec une seule unité.
    const product = await prisma.product.create({
      data: {
        code: productCode,
        name: "TEST FIFO EXPIRATION",
        price: 1000,
        stock: 1,
      },
    });
    productId = product.id;

    // Le premier client obtient l'unique unité.
    const firstResult = await createOrderFromComment({
      productCode,
      quantity: 1,
      customerFbId: fbIds[0],
      customerName: "Client FIFO 1",
      sourceCommentId: commentIds[0],
    });

    assert.equal(firstResult.success, true);
    assert.ok(firstResult.order);
    firstOrderId = firstResult.order.id;

    // Les deux autres clients rejoignent la liste d'attente.
    for (let index = 1; index <= 2; index++) {
      const result = await createOrderFromComment({
        productCode,
        quantity: 1,
        customerFbId: fbIds[index],
        customerName: `Client FIFO ${index + 1}`,
        sourceCommentId: commentIds[index],
      });

      assert.equal(result.success, false);
      assert.equal(result.waitlisted, true);
    }

    // Vérifier que les deux clients sont en attente.
    const waitingEntries = await prisma.waitlistEntry.findMany({
      where: {
        fbCommentId: {
          in: commentIds.slice(1),
        },
      },
      orderBy: { createdAt: "asc" },
    });

    assert.equal(waitingEntries.length, 2);
    assert.equal(waitingEntries[0].status, "WAITING");
    assert.equal(waitingEntries[1].status, "WAITING");

    // Faire expirer la première commande.
    await prisma.order.update({
      where: { id: firstOrderId },
      data: {
        reservationExpiresAt: new Date(Date.now() - 60_000),
      },
    });

    const expiredCount = await expireReservations();
    assert.equal(expiredCount, 1);

    // Vérifier la priorité FIFO.
    const updatedEntries = await prisma.waitlistEntry.findMany({
      where: {
        fbCommentId: {
          in: commentIds.slice(1),
        },
      },
      orderBy: { createdAt: "asc" },
      include: { order: true },
    });

    assert.equal(updatedEntries[0].status, "RESERVED");
    assert.equal(updatedEntries[1].status, "WAITING");

    assert.ok(updatedEntries[0].order);
    assert.equal(updatedEntries[0].order?.reservationExpiresAt, null);

    const updatedProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });

    assert.equal(updatedProduct?.stock, 0);

    console.log("SUCCÈS : la première commande a expiré.");
    console.log("SUCCÈS : le premier client FIFO a obtenu la réservation.");
    console.log("SUCCÈS : le deuxième client est toujours en attente.");
    console.log("SUCCÈS : aucun délai de 24 heures n'a commencé.");
    console.log("SUCCÈS : le stock final est correct.");
  } finally {
    // Nettoyer les données du scénario.
    await prisma.stockMovement.deleteMany({
      where: { productId },
    });

    await prisma.waitlistEntry.deleteMany({
      where: { fbCommentId: { in: commentIds } },
    });

    await prisma.order.deleteMany({
      where: { productId },
    });

    await prisma.comment.deleteMany({
      where: { fbCommentId: { in: commentIds } },
    });

    if (productId) {
      await prisma.product.delete({
        where: { id: productId },
      });
    }

    await prisma.customer.deleteMany({
      where: { fbUserId: { in: fbIds } },
    });
  }
}

main()
  .catch((error) => {
    console.error("ÉCHEC DU TEST FIFO :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
