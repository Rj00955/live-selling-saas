
import { findProductByCode } from "./product-service.js";
import { prisma } from "./db.js";

async function main() {
  try {
    const product = await findProductByCode("A1");

    if (!product) {
      console.log("Produit A1 introuvable.");
      return;
    }

    console.log("Produit trouvé :");
    console.log(product);
  } catch (error) {
    console.error("Erreur pendant le test :", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
