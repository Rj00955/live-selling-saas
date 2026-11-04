import { createOrderFromComment } from "./order-service.js";
import { prisma } from "./db.js";

async function main() {
  const productCode = "A1";

  // Vérifier le stock initial.
  const productBefore = await prisma.product.findUnique({
    where: { code: productCode },
  });

  if (!productBefore) {
    throw new Error("Le produit A1 n'existe pas dans la base de données.");
  }

  console.log("Stock initial :", productBefore.stock);

  // Créer une commande de test.
  const result = await createOrderFromComment({
    productCode,
    quantity: 1,
    customerFbId: "TEST_CUSTOMER_001",
    customerName: "Client test",
    sourceCommentId: "TEST_COMMENT_ORDER_001",
  });

  console.log("Résultat de la commande :", result);

  // Vérifier le stock après la commande.
  const productAfter = await prisma.product.findUnique({
    where: { code: productCode },
  });

  console.log("Stock après commande :", productAfter?.stock);

  // Vérifier qu'un second traitement du même commentaire est refusé.
  const duplicateResult = await createOrderFromComment({
    productCode,
    quantity: 1,
    customerFbId: "TEST_CUSTOMER_001",
    customerName: "Client test",
    sourceCommentId: "TEST_COMMENT_ORDER_001",
  });

  console.log("Résultat du doublon :", duplicateResult);

  // Vérifier une dernière fois le stock.
  const productFinal = await prisma.product.findUnique({
    where: { code: productCode },
  });

  console.log("Stock final :", productFinal?.stock);
}

main()
  .catch((error) => {
    console.error("Erreur pendant le test :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });