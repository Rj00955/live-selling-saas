import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../config/db.js";
import { createOrderFromComment } from "../services/order-service.js";

const baseInput = {
  productCode: "TSTV1",
  quantity: 1,
  customerFbId: "test-customer-errors",
  customerName: "Test erreurs",
};

async function testError(
  name: string,
  input: Parameters<typeof createOrderFromComment>[0],
  expectedMessage: string
) {
  const result = await createOrderFromComment(input);

  assert.equal(result.success, false, `${name} : la commande aurait dû être refusée.`);
  assert.equal(
    result.message,
    expectedMessage,
    `${name} : le message d'erreur est incorrect.`
  );

  console.log(`OK : ${name} → ${result.message}`);
}

try {
  const before = await prisma.product.findUnique({
    where: { code: "TSTV1" },
    include: { variants: true },
  });

  assert.ok(before, "Produit TSTV1 introuvable.");

  const initialM = before.variants.find(
    v => v.size === "M" && v.color === "NOIR"
  )?.stock;

  const initialL = before.variants.find(
    v => v.size === "L" && v.color === "NOIR"
  )?.stock;

  assert.equal(initialM, 5);
  assert.equal(initialL, 3);
  assert.equal(before.stock, 0);

  const testId = `error-test-${Date.now()}`;
  const testComments = [
  `${testId}-size`,
  `${testId}-variant`,
  `${testId}-stock`,
];

await prisma.comment.createMany({
  data: testComments.map((fbCommentId) => ({
    fbCommentId,
    fbUserId: baseInput.customerFbId,
    userName: baseInput.customerName,
    message: "Test automatique",
  })),
});
  await testError(
    "Taille manquante",
    {
      ...baseInput,
      color: "NOIR",
      sourceCommentId: `${testId}-size`,
    },
    "Merci de préciser la taille souhaitée."
  );

  await testError(
    "Variante inexistante",
    {
      ...baseInput,
      size: "XL",
      color: "NOIR",
      sourceCommentId: `${testId}-variant`,
    },
    "Cette combinaison de taille et de couleur n'existe pas."
  );

  await testError(
    "Stock insuffisant",
    {
      ...baseInput,
      quantity: 999,
      size: "M",
      color: "NOIR",
      sourceCommentId: `${testId}-stock`,
    },
    "Stock insuffisant. Votre demande a été ajoutée à la liste d'attente."
  );

  const after = await prisma.product.findUnique({
    where: { code: "TSTV1" },
    include: { variants: true },
  });

  assert.ok(after);
  assert.equal(after.stock, 0);
  assert.equal(
    after.variants.find(v => v.size === "M" && v.color === "NOIR")?.stock,
    initialM
  );
  assert.equal(
    after.variants.find(v => v.size === "L" && v.color === "NOIR")?.stock,
    initialL
  );

  console.log("OK : aucun stock n'a été modifié.");
  console.log("Tous les tests d'erreur sont réussis.");
} finally {
  await prisma.$disconnect();
}
