import { findProductByCode } from "./product-service.js";
import { prisma } from "./db.js";

async function main() {
  try {
    const product = await findProductByCode("A1");

    if (!product) {
      console.log("❌ Produit A1 introuvable.");
      return;
    }

    console.log("✅ Produit trouvé !");
    console.log("Code :", product.code);
    console.log("Nom :", product.name);
    console.log("Prix :", product.price);
    console.log("Stock :", product.stock);
  } catch (error) {
    console.error("❌ Erreur pendant la recherche :", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();