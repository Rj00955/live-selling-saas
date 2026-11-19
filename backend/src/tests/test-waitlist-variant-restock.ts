import assert from "node:assert/strict";
import { prisma } from "../config/db.js";
import { createOrderFromComment } from "../services/order-service.js";
import { createProduct, updateProduct } from "../services/product-service.js";

async function main() {
  const suffix = Date.now().toString();
  const productCode = `VARRESTOCK${suffix}`;
  const fbIds = [`VARRESTOCK_C1_${suffix}`, `VARRESTOCK_C2_${suffix}`];
  const commentIds = [`VARRESTOCK_COMMENT_1_${suffix}`, `VARRESTOCK_COMMENT_2_${suffix}`];

  let productId: string | undefined;

  try {
    const customers = await Promise.all(
      fbIds.map((fbUserId, index) =>
        prisma.customer.create({
          data: { fbUserId, name: `Client VARRESTOCK ${index + 1}` },
        }),
      ),
    );

    await Promise.all(
      commentIds.map((fbCommentId, index) =>
        prisma.comment.create({
          data: {
            fbCommentId,
            fbUserId: fbIds[index],
            userName: `Client VARRESTOCK ${index + 1}`,
            message: `Je prends ${productCode} M NOIR`,
            customerId: customers[index].id,
          },
        }),
      ),
    );

    const product = await createProduct({
      code: productCode,
      name: "TEST RESTOCK VARIANTES",
      price: 1000,
      stock: 0,
      hasVariants: true,
      variants: [
        { size: "M", color: "NOIR", stock: 0 },
        { size: "L", color: "BLANC", stock: 2 },
      ],
    });
    productId = product.id;

    for (let index = 0; index < 2; index++) {
      const result = await createOrderFromComment({
        productCode,
        quantity: 1,
        customerFbId: fbIds[index],
        customerName: `Client VARRESTOCK ${index + 1}`,
        sourceCommentId: commentIds[index],
        size: "M",
        color: "NOIR",
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

    await updateProduct(product.id, {
      variants: [
        { size: "M", color: "NOIR", stock: 5 },
        { size: "L", color: "BLANC", stock: 2 },
      ],
    });

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

    const variants = await prisma.productVariant.findMany({
      where: { productId: product.id },
    });

    const variantM = variants.find(
      (variant) => variant.size === "M" && variant.color === "NOIR",
    );
    const variantL = variants.find(
      (variant) => variant.size === "L" && variant.color === "BLANC",
    );

    assert.ok(variantM);
    assert.ok(variantL);
    assert.equal(variantM.stock, 4);
    assert.equal(variantL.stock, 2);

    console.log("SUCCÈS : le premier client FIFO a obtenu la réservation M / NOIR.");
    console.log("SUCCÈS : le deuxième client reste en attente.");
    console.log("SUCCÈS : le délai de 24 heures a commencé dès la réservation.");
    console.log("SUCCÈS : le stock M / NOIR est de 4 unités.");
    console.log("SUCCÈS : le stock L / BLANC est resté à 2 unités.");
  } finally {
    if (productId) {
      await prisma.stockMovement.deleteMany({ where: { productId } });
    }

    await prisma.waitlistEntry.deleteMany({
      where: { fbCommentId: { in: commentIds } },
    });

    if (productId) {
      await prisma.order.deleteMany({ where: { productId } });
    }

    await prisma.comment.deleteMany({
      where: { fbCommentId: { in: commentIds } },
    });

    if (productId) {
      await prisma.productVariant.deleteMany({ where: { productId } });
      await prisma.product.delete({ where: { id: productId } });
    }

    await prisma.customer.deleteMany({
      where: { fbUserId: { in: fbIds } },
    });
  }
}

main()
  .catch((error) => {
    console.error("ÉCHEC DU TEST RESTOCK VARIANTES :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
