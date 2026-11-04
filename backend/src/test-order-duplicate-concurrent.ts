import { createOrderFromComment } from "./order-service.js";
import { prisma } from "./db.js";

async function main() {
  const productCode = "A1";
  const sourceCommentId = `TEST_CONCURRENT_${Date.now()}`;

  const productBefore = await prisma.product.findUnique({
    where: { code: productCode },
  });

  if (!productBefore) {
    throw new Error(`Le produit ${productCode} est introuvable.`);
  }

  console.log("Stock initial :", productBefore.stock);
  console.log("Identifiant de test :", sourceCommentId);

  // Simule deux traitements simultanés du même commentaire.
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
    where: { code: productCode },
  });

  const orderCount = await prisma.order.count({
    where: { sourceCommentId },
  });

  console.log("Stock final :", productAfter?.stock);
  console.log("Nombre de commandes créées :", orderCount);

  if (
    results.filter((result) => result.success).length !== 1 ||
    orderCount !== 1 ||
    productAfter?.stock !== productBefore.stock - 1
  ) {
    throw new Error(
      "ÉCHEC : le test de concurrence n'a pas produit le résultat attendu."
    );
  }

  console.log("SUCCÈS : une seule commande et une seule diminution du stock.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });