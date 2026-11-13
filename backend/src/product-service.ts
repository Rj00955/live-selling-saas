import { prisma } from "./db.js";

export async function findProductByCode(code: string) {
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode) {
    return null;
  }

  const product = await prisma.product.findUnique({
    where: {
      code: normalizedCode,
    },
  });

  return product;
}

interface CreateProductInput {
  code: string;
  name: string;
  price: number;
  stock: number;
}

export async function createProduct(input: CreateProductInput) {
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();

  if (!code) {
    throw new Error("Le code produit est obligatoire.");
  }

  if (!name) {
    throw new Error("Le nom du produit est obligatoire.");
  }

  if (!Number.isInteger(input.price) || input.price <= 0) {
    throw new Error("Le prix doit être un entier positif.");
  }

  if (!Number.isInteger(input.stock) || input.stock < 0) {
    throw new Error("Le stock doit être un entier positif ou nul.");
  }

  return prisma.product.create({
    data: {
      code,
      name,
      price: input.price,
      stock: input.stock,
    },
  });
}

interface UpdateProductInput {
  code?: string;
  name?: string;
  price?: number;
  stock?: number;
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
) {
  const data: UpdateProductInput = {};

  if (input.code !== undefined) {
    const code = input.code.trim().toUpperCase();
    if (!code) throw new Error("Le code produit est obligatoire.");
    data.code = code;
  }

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Le nom du produit est obligatoire.");
    data.name = name;
  }

  if (input.price !== undefined) {
    if (!Number.isInteger(input.price) || input.price <= 0) {
      throw new Error("Le prix doit être un entier positif.");
    }
    data.price = input.price;
  }

  if (input.stock !== undefined) {
    if (!Number.isInteger(input.stock) || input.stock < 0) {
      throw new Error("Le stock doit être un entier positif ou nul.");
    }
    data.stock = input.stock;
  }

  if (Object.keys(data).length === 0) {
    throw new Error("Aucune modification fournie.");
  }

  return prisma.product.update({
    where: { id },
    data,
  });
}

// Supprime le produit. La contrainte de clé étrangère Prisma/PostgreSQL
// empêche la suppression si des commandes référencent encore ce produit.
export async function deleteProduct(id: string) {
  return prisma.product.delete({
    where: { id },
  });
}
