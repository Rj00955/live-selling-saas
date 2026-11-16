import { prisma } from "./db.js";
import { createOrderFromComment } from "./order-service.js";

async function main() {
  const suffix = Date.now().toString();
  const product = await prisma.product.create({
    data: {
      code: `AUTO${suffix}`,
      name: "TEST EXPIRATION AUTO",
      price: 1000,
      stock: 5,
    },
  });

  try {
    const result = await createOrderFromComment({
      productCode: product.code,
      quantity: 1,
      customerFbId: `AUTO_TEST_${suffix}`,
      sourceCommentId: `AUTO_COMMENT_${suffix}`,
    });

    if (!result.success || !result.order) {
      throw new Error(result.message || "Création de réservation échouée");
    }

    await prisma.order.update({
      where: { id: result.order.id },
      data: { reservationExpiresAt: new Date(Date.now() - 60000) },
    });

    console.log("ID_COMMANDE:", result.order.id);
    console.log("ID_PRODUIT:", product.id);
    console.log("TEST_PREPARE");
  } catch (error) {
    await prisma.product.delete({ where: { id: product.id } });
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
