
import assert from "node:assert/strict";
import { prisma } from "../config/db.js";
import { createOrderFromComment } from "../services/order-service.js";

async function main() {
  const suffix = Date.now().toString();
  const productCode = `STOCK${suffix}`;
  const sourceCommentId1 = `TEST_STOCK_CONCURRENCY_1_${suffix}`;
  const sourceCommentId2 = `TEST_STOCK_CONCURRENCY_2_${suffix}`;

  let productId: string | undefined;

  try {
    // 1. Créer un produit avec une seule unité en stock
    const product = await prisma.product.create({
      data: {
        code: productCode,
        name: "Produit test concurrence stock",
        price: 10000,
        stock: 1,
      },
    });

    productId = product.id;
      await prisma.comment.createMany({
  data: [
    {
      fbCommentId: sourceCommentId1,
      fbUserId: `CUSTOMER_A_${suffix}`,
      userName: "Client A",
      message: `${productCode} x1`,
    },
    {
      fbCommentId: sourceCommentId2,
      fbUserId: `CUSTOMER_B_${suffix}`,
      userName: "Client B",
      message: `${productCode} x1`,
    },
  ],
});

    console.log("Produit créé :", productCode);
    console.log("Stock initial :", product.stock);

    // 2. Deux clients différents achètent simultanément
    const results = await Promise.all([
      createOrderFromComment({
        productCode,
        quantity: 1,
        customerFbId: `CUSTOMER_A_${suffix}`,
        customerName: "Client A",
        sourceCommentId: sourceCommentId1,
      }),
      createOrderFromComment({
        productCode,
        quantity: 1,
        customerFbId: `CUSTOMER_B_${suffix}`,
        customerName: "Client B",
        sourceCommentId: sourceCommentId2,
      }),
    ]);

    console.log("Résultats des deux commandes :", results);

    // 3. Vérifier le stock final
    const productAfter = await prisma.product.findUnique({
      where: { id: productId },
    });

    // 4. Compter les commandes créées
    const orderCount = await prisma.order.count({
      where: {
        sourceCommentId: {
          in: [sourceCommentId1, sourceCommentId2],
        },
      },
    });

    const successCount = results.filter(
      (result) => result.success,
    ).length;

    console.log("Commandes réussies :", successCount);
    console.log("Nombre de commandes en base :", orderCount);
    console.log("Stock final :", productAfter?.stock);

    // 5. Assertions
    assert.equal(
      successCount,
      1,
      "Une seule commande doit être acceptée.",
    );

    assert.equal(
      orderCount,
      1,
      "Une seule commande doit être enregistrée.",
    );

    assert.equal(
      productAfter?.stock,
      0,
      "Le stock final doit être exactement égal à zéro.",
    );

    assert.ok(
      productAfter!.stock >= 0,
      "Le stock ne doit jamais devenir négatif.",
    );

    console.log(
      "SUCCÈS : la concurrence sur le stock est correctement gérée.",
    );
  
  } finally {
    // Nettoyage des données de test
    const commentIds = [sourceCommentId1, sourceCommentId2];

    // Récupérer les commandes créées par ce test
    const testOrders = await prisma.order.findMany({
      where: {
        sourceCommentId: {
          in: commentIds,
        },
      },
      select: {
        id: true,
      },
    });

    const orderIds = testOrders.map((order) => order.id);

    // Supprimer d'abord les mouvements liés aux commandes
    if (orderIds.length > 0) {
      await prisma.stockMovement.deleteMany({
        where: {
          orderId: {
            in: orderIds,
          },
        },
      });
    }

    // Supprimer ensuite les commandes
    await prisma.order.deleteMany({
      where: {
        sourceCommentId: {
          in: commentIds,
        },
      },
    });
    await prisma.waitlistEntry.deleteMany({
  where: {
    fbCommentId: {
      in: commentIds,
    },
  },
});

await prisma.comment.deleteMany({
  where: {
    fbCommentId: {
      in: commentIds,
    },
  },
});
    
    // Supprimer les mouvements et le produit de test
    if (productId) {
      await prisma.stockMovement.deleteMany({
        where: { productId },
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
