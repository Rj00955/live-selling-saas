
import { prisma } from "./db.js";

const id = "cmwj9zjvu0000vvvcjltt0dl8";

try {
  await prisma.productVariant.deleteMany({
    where: { productId: id },
  });

  await prisma.product.delete({
    where: { id },
  });

  console.log("OK : produit temporaire supprimé.");
} finally {
  await prisma.$disconnect();
}
