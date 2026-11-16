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

  const movements = await prisma.stockMovement.findMany({
    where: { orderId },
  });

  console.log("STATUT_COMMANDE:", order?.status);
  console.log("DATE_LIBERATION:", order?.stockReleasedAt);
  console.log("STOCK_PRODUIT:", product?.stock);
  console.log("NOMBRE_MOUVEMENTS:", movements.length);
  console.log("TYPES_MOUVEMENTS:", movements.map(m => m.type));
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
