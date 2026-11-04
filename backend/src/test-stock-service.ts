import { checkStock } from "./stock-service.js";
import { prisma } from "./db.js";

async function main() {
  try {
    const tests = [
      { code: "A1", quantity: 1 },
      { code: "A1", quantity: 10 },
      { code: "A1", quantity: 11 },
      { code: "INEXISTANT", quantity: 1 },
    ];

    for (const test of tests) {
      const result = await checkStock(test.code, test.quantity);

      console.log({
        code: test.code,
        quantity: test.quantity,
        available: result.available,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("Erreur pendant les tests :", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();