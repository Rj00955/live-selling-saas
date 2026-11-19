import { randomUUID } from "node:crypto";
import {
  createProduct,
  findProductByCode,
  deleteProduct,
} from "../services/product-service.js";
import { prisma } from "../config/db.js";

async function main() {
  const code = `LOOKUP-${randomUUID().slice(0, 8)}`.toUpperCase();
  let productId: string | null = null;

  try {
    const created = await createProduct({
      code,
      name: "Produit temporaire lookup",
      price: 10000,
      stock: 5,
    });

    productId = created.id;

    const found = await findProductByCode(code.toLowerCase());

    if (!found) {
      throw new Error("Le produit créé n'a pas été retrouvé.");
    }

    console.log("Produit créé :", created);
    console.log("Produit retrouvé :", found);
    console.log("Comparaisons :", {
      codeIdentique: found.code === code,
      nomIdentique: found.name === "Produit temporaire lookup",
      codeAttendu: JSON.stringify(code),
      codeRecu: JSON.stringify(found.code),
      nomRecu: JSON.stringify(found.name),
    });
    if (found.code !== code || found.name !== "Produit temporaire lookup") {
      throw new Error("Les informations du produit retrouvé sont incorrectes.");
    }

    console.log("SUCCÈS : recherche du produit par code validée.");
    console.log({
      code: found.code,
      name: found.name,
      stock: found.stock,
    });
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



