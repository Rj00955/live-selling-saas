
import assert from "node:assert/strict";
import { createOrderFromComment } from "../services/order-service.js";
import { prisma } from "../config/db.js";

async function main() {
  const productCode = `CONC${Date.now()}`;
  const sourceCommentId = `TEST_CONCURRENT_${Date.now()}`;

  let productId: string | undefined;

  try {
    const product = await prisma.product.create({
      data: {
        code: productCode,
        name: "Produit test concurrence",
        price: 10000,
        stock: 5,
      },
    });

    productId = product.id;

    console.log("Produit de test créé :", productCode);
    console.log("Stock initial :", product.stock);

    const results = await Promise.all([
      createOrderFromComment({
        productCode,
        quantity: 1,
        customerFbId: "TEST_CUSTOMER_CONCURRENT",
        customerName: "Test concurrence",
        sourceCommentId,
      }),
      createOrderFromComment({
        productCode,
        quantity: 1,
        customerFbId: "TEST_CUSTOMER_CONCURRENT",
        customerName: "Test concurrence",
        sourceCommentId,
      }),
    ]);

    console.log("Résultats :", results);

    const productAfter = await prisma.product.findUnique({
      where: { id: product.id },
    });

    const orderCount = await prisma.order.count({
      where: { sourceCommentId },
    });

    console.log("Stock final :", productAfter?.stock);
    console.log("Nombre de commandes :", orderCount);

    assert.equal(
      results.filter((result) => result.success).length,
      1,
      "Une seule commande doit réussir."
    );

    assert.equal(orderCount, 1, "Une seule commande doit être créée.");

    assert.equal(
      productAfter?.stock,
      product.stock - 1,
      "Le stock doit diminuer une seule fois."
    );

    console.log("SUCCÈS : la concurrence est correctement gérée.");
  } finally {
    if (productId) {
      await prisma.stockMovement.deleteMany({
        where: { productId },
      });

      await prisma.order.deleteMany({
        where: { sourceCommentId },
      });

      await prisma.product.delete({
        where: { id: productId },
      });
    }
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
