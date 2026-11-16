import { prisma } from "./db.js";

const orderId = "cmwjaajvn0002vv0w6vthg8z9";
const productId = "cmwjaajuz0000vv0wuz3u3qb9";

async function main() {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!order || !product || order.productId !== productId) {
    throw new Error("Arrêt : commande ou produit introuvable, ou association incorrecte.");
  }

  const orders = await prisma.order.findMany({
    where: { productId },
    select: { id: true },
  });

  const movements = await prisma.stockMovement.findMany({
    where: { productId },
    select: { id: true, orderId: true },
  });

  if (orders.length !== 1 || orders[0].id !== orderId) {
    throw new Error("Arrêt : le produit possède d'autres commandes.");
  }

  if (movements.some(m => m.orderId !== orderId)) {
    throw new Error("Arrêt : le produit possède d'autres mouvements de stock.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.deleteMany({
      where: { orderId },
    });

    await tx.order.delete({
      where: { id: orderId },
    });

    await tx.product.delete({
      where: { id: productId },
    });
  });

  console.log("NETTOYAGE TERMINÉ");
  console.log("Commande de test supprimée.");
  console.log("Produit de test supprimé.");
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
