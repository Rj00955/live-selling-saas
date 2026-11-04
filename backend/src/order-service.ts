import { Prisma } from "@prisma/client";
import { prisma } from "./db.js";

type CreateOrderInput = {
  productCode: string;
  quantity?: number;
  customerFbId: string;
  customerName?: string | null;
  sourceCommentId: string;
};

export async function createOrderFromComment(input: CreateOrderInput) {
  const productCode = input.productCode.trim().toUpperCase();
  const quantity = input.quantity ?? 1;
  const sourceCommentId = input.sourceCommentId.trim();

  if (!productCode) {
    return { success: false, message: "Code produit manquant." };
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return {
      success: false,
      message: "La quantité doit être un entier positif.",
    };
  }

  if (!input.customerFbId.trim() || !sourceCommentId) {
    return {
      success: false,
      message: "Identifiant client ou commentaire manquant.",
    };
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      // Vérification rapide : le commentaire a-t-il déjà créé une commande ?
      const existingOrder = await tx.order.findUnique({
        where: { sourceCommentId },
      });

      if (existingOrder) {
        throw new Error("DUPLICATE_COMMENT");
      }

      const product = await tx.product.findUnique({
        where: { code: productCode },
      });

      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      // Mise à jour atomique : le stock ne peut pas devenir négatif.
      const stockUpdate = await tx.product.updateMany({
        where: {
          id: product.id,
          stock: { gte: quantity },
        },
        data: {
          stock: { decrement: quantity },
        },
      });

      if (stockUpdate.count !== 1) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      // La commande et la diminution du stock appartiennent
      // à la même transaction.
      return tx.order.create({
        data: {
          productId: product.id,
          quantity,
          customerFbId: input.customerFbId,
          customerName: input.customerName ?? null,
          sourceCommentId,
        },
      });
    });

    return {
      success: true,
      message: "Commande créée et stock mis à jour.",
      order,
    };
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "DUPLICATE_COMMENT":
          return {
            success: false,
            duplicate: true,
            message: "Ce commentaire a déjà été traité.",
          };

        case "PRODUCT_NOT_FOUND":
          return {
            success: false,
            duplicate: false,
            message: "Produit introuvable.",
          };

        case "INSUFFICIENT_STOCK":
          return {
            success: false,
            duplicate: false,
            message: "Stock insuffisant.",
          };
      }
    }

    // La contrainte unique PostgreSQL reste la protection finale
    // si deux traitements passent simultanément la vérification initiale.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existingOrder = await prisma.order.findUnique({
        where: { sourceCommentId },
      });

      if (existingOrder) {
        return {
          success: false,
          duplicate: true,
          message: "Ce commentaire a déjà été traité.",
        };
      }
    }

    // Les erreurs inattendues doivent rester visibles dans les logs.
    throw error;
  }
}