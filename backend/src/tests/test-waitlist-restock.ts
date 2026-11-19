import assert from "node:assert/strict";
import { prisma } from "../config/db.js";
import { confirmOrder, createOrderFromComment } from "../services/order-service.js";
import { updateProduct } from "../services/product-service.js";

async function main() {
  const suffix = Date.now().toString();
  const productCode = `RESTOCK${suffix}`;
  const fbIds = [`RESTOCK_C1_${suffix}`, `RESTOCK_C2_${suffix}`];
  const commentIds = [`RESTOCK_COMMENT_1_${suffix}`, `RESTOCK_COMMENT_2_${suffix}`];

  let productId: string | undefined;

  try {
    const customers = await Promise.all(
      fbIds.map((fbUserId, index) =>
        prisma.customer.create({
          data: { fbUserId, name: `Client RESTOCK ${index + 1}` },
        }),
      ),
    );

    await Promise.all(
      commentIds.map((fbCommentId, index) =>
        prisma.comment.create({
          data: {
            fbCommentId,
            fbUserId: fbIds[index],
            userName: `Client RESTOCK ${index + 1}`,
            message: `Je prends ${productCode}`,
            customerId: customers[index].id,
          },
        }),
      ),
    );

    const product = await prisma.product.create({
      data: {
        code: productCode,
        name: "TEST RESTOCK FIFO",
        price: 1000,
        stock: 0,
      },
    });
    productId = product.id;

    for (let index = 0; index < 2; index++) {
      const result = await createOrderFromComment({
        productCode,
        quantity: 1,
        customerFbId: fbIds[index],
        customerName: `Client RESTOCK ${index + 1}`,
        sourceCommentId: commentIds[index],
      });

      assert.equal(result.success, false);
      assert.equal(result.waitlisted, true);
    }

    await prisma.waitlistEntry.update({
      where: { fbCommentId: commentIds[0] },
      data: { createdAt: new Date(Date.now() - 60_000) },
    });

    await prisma.waitlistEntry.update({
      where: { fbCommentId: commentIds[1] },
      data: { createdAt: new Date() },
    });

    await updateProduct(product.id, { stock: 5 });

    const entries = await prisma.waitlistEntry.findMany({
      where: { fbCommentId: { in: commentIds } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: { order: true },
    });

    assert.equal(entries[0].status, "RESERVED");
    assert.ok(entries[0].order);
    assert.equal(entries[0].order.status, "PENDING");
    assert.ok(entries[0].order.reservationExpiresAt);
    assert.ok(entries[0].order.reservationExpiresAt.getTime() > Date.now());
    assert.ok(
      entries[0].order.reservationExpiresAt.getTime() - Date.now() <=
        24 * 60 * 60 * 1000,
    );
    assert.equal(entries[1].status, "WAITING");

    // Une réservation issue de la liste d'attente doit pouvoir être confirmée.
    const confirmation = await confirmOrder(entries[0].order.id);
    assert.equal(confirmation.success, true);

    const confirmedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: entries[0].order.id },
    });
    const confirmedEntry = await prisma.waitlistEntry.findUniqueOrThrow({
      where: { fbCommentId: commentIds[0] },
    });

    assert.equal(confirmedOrder.status, "CONFIRMED");
    assert.equal(confirmedEntry.status, "FULFILLED");

    const updatedProduct = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    });

    assert.equal(updatedProduct.stock, 4);

    console.log("SUCCÈS : le premier client FIFO a obtenu sa réservation de 24 h.");
    console.log("SUCCÈS : la réservation issue de la liste d'attente est confirmable.");
    console.log("SUCCÈS : l'entrée est passée à FULFILLED.");
    console.log("SUCCÈS : le deuxième client reste en attente.");
    console.log("SUCCÈS : le stock disponible est de 4 unités.");
  } finally {
    await prisma.stockMovement.deleteMany({ where: { productId } });
    await prisma.waitlistEntry.deleteMany({
      where: { fbCommentId: { in: commentIds } },
    });
    await prisma.order.deleteMany({ where: { productId } });
    await prisma.comment.deleteMany({
      where: { fbCommentId: { in: commentIds } },
    });

    if (productId) {
      await prisma.product.delete({ where: { id: productId } });
    }

    await prisma.customer.deleteMany({
      where: { fbUserId: { in: fbIds } },
    });
  }
}

main()
  .catch((error) => {
    console.error("ÉCHEC DU TEST RESTOCK FIFO :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
