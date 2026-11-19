import { prisma } from "../config/db.js";

export async function checkStock(
  productCode: string,
  quantity: number = 1,
) {
  const code = productCode.trim().toUpperCase();

  if (!Number.isInteger(quantity) || quantity < 1) {
    return {
      available: false,
      message: "La quantité demandée doit être un entier positif.",
    };
  }

  const product = await prisma.product.findUnique({
    where: { code },
  });

  if (!product) {
    return {
      available: false,
      message: "Produit introuvable.",
    };
  }

  if (product.stock < quantity) {
    return {
      available: false,
      message: "Stock insuffisant.",
      product,
    };
  }

  return {
    available: true,
    message: "Stock disponible.",
    product,
  };
}