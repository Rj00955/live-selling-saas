import assert from "node:assert/strict";
import { prisma } from "../config/db.js";
import { createOrderFromComment } from "../services/order-service.js";

async function testWaitlist() {
  const suffix = Date.now();
  const productCode = `WAIT${suffix}`;
  const customerFbId = `CUSTOMER${suffix}`;
  const fbCommentId = `COMMENT${suffix}`;

  let productId: string | undefined;
  let customerId: string | undefined;

  try {
    const customer = await prisma.customer.create({
      data: { fbUserId: customerFbId, name: "Test waitlist" },
    });
    customerId = customer.id;

    const comment = await prisma.comment.create({
      data: {
        fbCommentId,
        fbUserId: customerFbId,
        message: `Je prends ${productCode}`,
        customerId: customer.id,
      },
    });

    const product = await prisma.product.create({
      data: {
        code: productCode,
        name: "Produit test waitlist",
        price: 10000,
        stock: 0,
      },
    });
    productId = product.id;

    const result = await createOrderFromComment({
      productCode,
      quantity: 1,
      customerFbId,
      customerName: "Test waitlist",
      sourceCommentId: fbCommentId,
    });

    assert.equal(result.success, false);
    assert.equal(result.waitlisted, true);

    const entry = await prisma.waitlistEntry.findUnique({
      where: { fbCommentId },
    });

    const duplicateResult = await createOrderFromComment({
  productCode,
  quantity: 1,
  customerFbId,
  customerName: "Test waitlist",
  sourceCommentId: fbCommentId,
});

assert.equal(duplicateResult.success, false);
assert.equal(duplicateResult.duplicate, true);

const entries = await prisma.waitlistEntry.count({
  where: { fbCommentId },
});

assert.equal(entries, 1);

console.log("SUCCÈS : aucun doublon dans la liste d'attente.");

    assert.ok(entry, "Entrée de liste d'attente introuvable.");
    assert.equal(entry.productId, product.id);
    assert.equal(entry.quantity, 1);
    assert.equal(entry.status, "WAITING");

    const updatedProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });

    assert.equal(updatedProduct?.stock, 0);

    const order = await prisma.order.findUnique({
      where: { sourceCommentId: fbCommentId },
    });

    assert.equal(order, null);

    console.log("SUCCÈS : demande ajoutée à la liste d'attente.");
    console.log("SUCCÈS : aucune commande créée.");
    console.log("SUCCÈS : aucun stock déduit.");
  } finally {
    await prisma.waitlistEntry.deleteMany({
      where: { fbCommentId },
    });

    await prisma.comment.deleteMany({
      where: { fbCommentId },
    });

    if (productId) {
      await prisma.product.delete({ where: { id: productId } });
    }

    if (customerId) {
      await prisma.customer.delete({ where: { id: customerId } });
    }
  }
}

testWaitlist()
  .catch((error) => {
    console.error("ÉCHEC DU TEST :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });