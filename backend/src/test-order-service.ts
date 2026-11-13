import {
  createOrderFromComment,
  confirmOrder,
  cancelOrder,
} from "./order-service.js";
import { prisma } from "./db.js";

async function main() {
  const testCode = `TEST${Date.now()}`;
  let testProductId: string | undefined;

  try {
    // Créer un produit temporaire pour les tests.
    const product = await prisma.product.create({
      data: {
        code: testCode,
        name: "Produit temporaire de test",
        price: 10000,
        stock: 10,
      },
    });

    testProductId = product.id;

    console.log("Stock initial :", product.stock);

    // TEST 1 : création d'une commande.
    const sourceCommentId = `TEST_COMMENT_${Date.now()}`;

    const creation = await createOrderFromComment({
      productCode: testCode,
      quantity: 1,
      customerFbId: "TEST_CUSTOMER_001",
      customerName: "Client test",
      sourceCommentId,
    });

    console.log("\nTEST 1 - Création :", creation);

    if (!creation.success) {
      throw new Error("Échec de la création de commande.");
    }

    let currentProduct = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    });

    if (currentProduct.stock !== 9) {
      throw new Error("Le stock n'a pas été correctement déduit.");
    }

    // Récupérer la commande créée.
    const order = await prisma.order.findUniqueOrThrow({
      where: { sourceCommentId },
    });

    // TEST 2 : confirmation.
    const confirmation = await confirmOrder(order.id);

    console.log("\nTEST 2 - Confirmation :", confirmation);

    if (!confirmation.success) {
      throw new Error("Échec de la confirmation.");
    }

    const confirmedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });

    currentProduct = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    });

    if (
      confirmedOrder.status !== "CONFIRMED" ||
      currentProduct.stock !== 9
    ) {
      throw new Error("La confirmation a produit un résultat incorrect.");
    }

    // TEST 3 : création d'une deuxième commande.
    const secondCommentId = `TEST_COMMENT_2_${Date.now()}`;

    const secondCreation = await createOrderFromComment({
      productCode: testCode,
      quantity: 2,
      customerFbId: "TEST_CUSTOMER_002",
      customerName: "Deuxième client test",
      sourceCommentId: secondCommentId,
    });

    console.log("\nTEST 3 - Deuxième création :", secondCreation);

    if (!secondCreation.success) {
      throw new Error("Échec de la deuxième création.");
    }

    const secondOrder = await prisma.order.findUniqueOrThrow({
      where: { sourceCommentId: secondCommentId },
    });

    // TEST 4 : annulation et restitution du stock.
    const cancellation = await cancelOrder(secondOrder.id);

    console.log("\nTEST 4 - Annulation :", cancellation);

    if (!cancellation.success) {
      throw new Error("Échec de l'annulation.");
    }

    currentProduct = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    });

    if (currentProduct.stock !== 9) {
      throw new Error("Le stock n'a pas été correctement restitué.");
    }

    // TEST 5 : deuxième annulation.
    const secondCancellation = await cancelOrder(secondOrder.id);

    console.log("\nTEST 5 - Deuxième annulation :", secondCancellation);

    currentProduct = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    });

    if (currentProduct.stock !== 9) {
      throw new Error("Le stock a été restitué deux fois.");
    }

    console.log("\nTous les tests sont réussis !");
  } finally {
    // Nettoyage des données de test.
    if (testProductId) {
      await prisma.order.deleteMany({
        where: { productId: testProductId },
      });

      await prisma.product.delete({
        where: { id: testProductId },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error("Échec des tests :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });