import { prisma } from "./db.js";

export async function findProductByCode(code: string) {
  const normalizedCode = code.trim().toUpperCase();

  const product = await prisma.product.findUnique({
    where: {
      code: normalizedCode,
    },
  });

  if (!product) {
    return null;
  }

  return product;
}