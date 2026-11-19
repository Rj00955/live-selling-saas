import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../config/db.js";
import { createOrderFromComment, cancelOrder } from "../services/order-service.js";

let orderId: string | undefined;

try {
  const before = await prisma.product.findUnique({
    where: { code: "TSTV1" },
    include: { variants: true },
  });

  assert.ok(before, "Produit TSTV1 introuvable.");
  assert.equal(before.stock, 0, "Le stock global doit être à 0.");
  assert.equal(
    before.variants.find(v => v.size === "M" && v.color === "NOIR")?.stock,
    5,
    "Le stock initial M/NOIR doit être 5."
  );

  const result = await createOrderFromComment({
    productCode: "TSTV1",
    quantity: 1,
    size: "M",
    color: "NOIR",
    customerFbId: "test-customer-variant",
    customerName: "Test automatique",
    sourceCommentId: `test-variant-${Date.now()}`,
  });

  if (!result.success || !result.order) {
  throw new Error(`Création échouée : ${result.message}`);
}

orderId = result.order.id;

  

  const after = await prisma.product.findUnique({
    where: { code: "TSTV1" },
    include: { variants: true },
  });

  assert.ok(after);
  assert.equal(after.stock, 0);
  assert.equal(
    after.variants.find(v => v.size === "M" && v.color === "NOIR")?.stock,
    4
  );
  assert.equal(
    after.variants.find(v => v.size === "L" && v.color === "NOIR")?.stock,
    3
  );

  console.log("OK : commande créée.");
  console.log("OK : stock M/NOIR = 4.");
  console.log("OK : stock L/NOIR = 3.");
  console.log("OK : stock global = 0.");
} finally {
  if (orderId) {
    const cancellation = await cancelOrder(orderId);
    assert.equal(cancellation.success, true, "Impossible d'annuler la commande de test.");

    const restored = await prisma.product.findUnique({
      where: { code: "TSTV1" },
      include: { variants: true },
    });

    assert.ok(restored);
    assert.equal(
      restored.variants.find(v => v.size === "M" && v.color === "NOIR")?.stock,
      5
    );

    console.log("OK : commande de test annulée, stock M/NOIR restauré à 5.");
  }

  await prisma.$disconnect();
}
