
import { randomUUID } from "node:crypto";
import { createProduct, deleteProduct } from "../services/product-service.js";
import { checkStock } from "../services/stock-service.js";
import { prisma } from "../config/db.js";

async function main() {
  const code = `STOCK-${randomUUID().slice(0, 8)}`.toUpperCase();
  let productId: string | null = null;

  try {
    const created = await createProduct({
      code,
      name: "Produit temporaire test stock",
      price: 10000,
      stock: 10,
    });

    productId = created.id;

    const tests = [
      { code, quantity: 1, expected: true },
      { code, quantity: 10, expected: true },
      { code, quantity: 11, expected: false },
      { code: "INEXISTANT", quantity: 1, expected: false },
      { code, quantity: 0, expected: false },
    ];

    let failures = 0;

    for (const test of tests) {
      const result = await checkStock(test.code, test.quantity);
      const passed = result.available === test.expected;

      if (!passed) failures++;

      console.log({
        code: test.code,
        quantity: test.quantity,
        available: result.available,
        message: result.message,
        resultat: passed ? "SUCCÈS" : "ÉCHEC",
      });
    }

    if (failures > 0) {
      throw new Error(`${failures} test(s) ont échoué.`);
    }

    console.log("SUCCÈS : tous les tests du service de stock sont validés.");
  } catch (error) {
    console.error("ÉCHEC DU TEST :", error);
    process.exitCode = 1;
  } finally {
    try {
      if (productId) {
        await deleteProduct(productId);
        console.log("Produit temporaire supprimé.");
      }
    } catch (cleanupError) {
      console.error("Erreur de nettoyage :", cleanupError);
      process.exitCode = 1;
    }

    await prisma.$disconnect();
  }
}

main();
