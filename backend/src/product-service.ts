
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db.js";

type ProductVariantInput = {
  size?: string | null;
  color?: string | null;
  stock: number;
};

interface CreateProductInput {
  code: string;
  name: string;
  price: number;
  stock: number;
  hasVariants?: boolean;
  variants?: ProductVariantInput[];
}

interface UpdateProductInput {
  code?: string;
  name?: string;
  price?: number;
  stock?: number;
  variants?: ProductVariantInput[];
}

function normalizeVariants(variants: ProductVariantInput[]) {
  if (variants.length === 0) {
    throw new Error("Au moins une variante est obligatoire.");
  }

  const normalized = variants.map((variant) => {
    const size = variant.size?.trim().toUpperCase() || null;
    const color = variant.color?.trim().toUpperCase() || null;

    if (!size && !color) {
      throw new Error(
        "Chaque variante doit avoir une taille ou une couleur.",
      );
    }

    if (!Number.isSafeInteger(variant.stock) || variant.stock < 0) {
      throw new Error("Le stock de chaque variante doit être positif ou nul.");
    }

    return {
      size,
      color,
      stock: variant.stock,
      combinationKey: [
        ...(size ? [`SIZE=${size}`] : []),
        ...(color ? [`COLOR=${color}`] : []),
      ].join("|"),
    };
  });

  // Toutes les variantes doivent utiliser les mêmes dimensions.
  const hasSize = normalized[0].size !== null;
  const hasColor = normalized[0].color !== null;

  for (const variant of normalized) {
    if (
      (variant.size !== null) !== hasSize ||
      (variant.color !== null) !== hasColor
    ) {
      throw new Error(
        "Toutes les variantes doivent utiliser les mêmes dimensions.",
      );
    }
  }

  const keys = normalized.map((variant) => variant.combinationKey);

  if (new Set(keys).size !== keys.length) {
    throw new Error("Deux variantes ont la même combinaison.");
  }

  return normalized;
}

export async function findProductByCode(code: string) {
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode) return null;

  return prisma.product.findUnique({
    where: { code: normalizedCode },
    include: { variants: true },
  });
}

export async function createProduct(input: CreateProductInput) {
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  const hasVariants = input.hasVariants ?? false;

  if (!code) {
    throw new Error("Le code produit est obligatoire.");
  }

  if (!name) {
    throw new Error("Le nom du produit est obligatoire.");
  }

  if (!Number.isSafeInteger(input.price) || input.price <= 0) {
    throw new Error("Le prix doit être un entier positif.");
  }

  if (!Number.isSafeInteger(input.stock) || input.stock < 0) {
    throw new Error("Le stock doit être un entier positif ou nul.");
  }

  const variants = hasVariants
    ? normalizeVariants(input.variants ?? [])
    : [];

  if (hasVariants && input.stock !== 0) {
    throw new Error(
      "Le stock global doit être égal à zéro pour un produit avec variantes.",
    );
  }

  if (!hasVariants && input.variants?.length) {
    throw new Error(
      "Un produit simple ne peut pas contenir de variantes.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        code,
        name,
        price: input.price,
        stock: hasVariants ? 0 : input.stock,
        hasVariants,
      },
    });

    if (hasVariants) {
      for (const variant of variants) {
        const createdVariant = await tx.productVariant.create({
          data: {
            productId: product.id,
            combinationKey: variant.combinationKey,
            size: variant.size,
            color: variant.color,
            stock: variant.stock,
          },
        });

        if (variant.stock > 0) {
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              productVariantId: createdVariant.id,
              type: "RESTOCK",
              quantity: variant.stock,
              note: "Stock initial de la variante",
              idempotencyKey: `initial-restock:${createdVariant.id}`,
            },
          });
        }
      }
    } else if (input.stock > 0) {
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          type: "RESTOCK",
          quantity: input.stock,
          note: "Stock initial du produit",
          idempotencyKey: `initial-restock:${product.id}`,
        },
      });
    }

    return tx.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { variants: true },
    });
  });
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existing) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    const data: Prisma.ProductUpdateInput = {};

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
      if (!Number.isSafeInteger(input.price) || input.price <= 0) {
        throw new Error("Le prix doit être un entier positif.");
      }
      data.price = input.price;
    }

    if (existing.hasVariants) {
      if (input.stock !== undefined && input.stock !== 0) {
        throw new Error(
          "Modifie le stock des variantes, pas le stock global du produit.",
        );
      }

      if (input.variants !== undefined) {
        const variants = normalizeVariants(input.variants);

        // Les dimensions d'un produit existant restent fixes.
if (existing.variants.length > 0) {
  const hasSize = existing.variants[0].size !== null;
  const hasColor = existing.variants[0].color !== null;

  for (const variant of variants) {
    if (
      (variant.size !== null) !== hasSize ||
      (variant.color !== null) !== hasColor
    ) {
      throw new Error(
        "Les dimensions des variantes ne peuvent pas être modifiées.",
      );
    }
  }
}

// Vérifier qu'aucune variante existante n'a été oubliée.
const submittedKeys = new Set(
  variants.map((variant) => variant.combinationKey),
);

const omittedVariants = existing.variants.filter(
  (variant) => !submittedKeys.has(variant.combinationKey),
);

if (omittedVariants.length > 0) {
  throw new Error(
    "Certaines variantes existantes sont absentes. Leur suppression doit être explicite.",
  );
}
        for (const variant of variants) {
  const previous = await tx.productVariant.findUnique({
    where: {
      productId_combinationKey: {
        productId: id,
        combinationKey: variant.combinationKey,
      },
    },
  });

  const previousStock = previous?.stock ?? 0;
  const difference = variant.stock - previousStock;

  const saved = await tx.productVariant.upsert({
    where: {
      productId_combinationKey: {
        productId: id,
        combinationKey: variant.combinationKey,
      },
    },
    create: {
      productId: id,
      combinationKey: variant.combinationKey,
      size: variant.size,
      color: variant.color,
      stock: variant.stock,
    },
    update: {
      stock: {
        increment: difference,
      },
    },
  });

  if (difference !== 0) {
    await tx.stockMovement.create({
      data: {
        productId: id,
        productVariantId: saved.id,
        type: previous ? "ADJUSTMENT" : "RESTOCK",
        quantity: previous ? difference : variant.stock,
        note: previous
          ? "Ajustement manuel du stock de la variante"
          : "Ajout d'une nouvelle variante",
        idempotencyKey: `variant-adjustment:${saved.id}:${randomUUID()}`,
      },
    });
  }
}
      }
    } else {
      if (input.variants !== undefined) {
        throw new Error(
          "Un produit simple ne peut pas recevoir de variantes sans conversion explicite.",
        );
      }

      if (input.stock !== undefined) {
        if (!Number.isSafeInteger(input.stock) || input.stock < 0) {
          throw new Error("Le stock doit être un entier positif ou nul.");
        }

        const difference = input.stock - existing.stock;
data.stock = { increment: difference };

        

        if (difference !== 0) {
          await tx.stockMovement.create({
            data: {
              productId: id,
              type: "ADJUSTMENT",
              quantity: difference,
              note: "Ajustement manuel du stock du produit",
              idempotencyKey: `product-adjustment:${id}:${randomUUID()}`,
            },
          });
        }
      }
    }

    if (Object.keys(data).length > 0) {
      await tx.product.update({
        where: { id },
        data,
      });
    }

    return tx.product.findUniqueOrThrow({
      where: { id },
      include: { variants: true },
    });
  });
}

export async function deleteProduct(id: string) {
  try {
    return await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const product = await tx.product.findUnique({
          where: { id },
        });

        if (!product) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        // Vérifier les commandes associées au produit.
        const orderCount = await tx.order.count({
          where: { productId: id },
        });

        if (orderCount > 0) {
          throw new Error("PRODUCT_HAS_HISTORY");
        }

        // Récupérer les mouvements de stock du produit.
        const movements = await tx.stockMovement.findMany({
          where: { productId: id },
          select: {
            idempotencyKey: true,
          },
        });

        // Seuls les mouvements de stock initiaux sont autorisés.
        // Les mouvements d'ajustement ou de réapprovisionnement
        // ultérieurs empêchent la suppression.
        const hasRealStockHistory = movements.some(
          (movement) =>
            !movement.idempotencyKey?.startsWith("initial-restock:"),
        );

        if (hasRealStockHistory) {
          throw new Error("PRODUCT_HAS_HISTORY");
        }

        // Supprimer d'abord les mouvements initiaux qui référencent
        // le produit ou ses variantes.
        await tx.stockMovement.deleteMany({
          where: {
            productId: id,
            idempotencyKey: {
              startsWith: "initial-restock:",
            },
          },
        });

        // Supprimer ensuite les variantes.
        await tx.productVariant.deleteMany({
          where: { productId: id },
        });

        // Enfin, supprimer le produit.
        return await tx.product.delete({
          where: { id },
        });
      },
    );
  } catch (error) {
    console.error("DELETE PRODUCT PRISMA ERROR:", error);
    throw error;
  }
}
