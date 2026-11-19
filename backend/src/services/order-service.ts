
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import { reserveNextWaitlistEntryTx } from "./waitlist-service.js";

type CreateOrderInput = {
  productCode: string;
  quantity?: number;
  customerFbId: string;
  customerName?: string | null;
  sourceCommentId: string;
  size?: string | null;
  color?: string | null;
};

const RESERVATION_HOURS = 24;

export async function createOrderFromComment(input: CreateOrderInput) {
  const productCode = input.productCode.trim().toUpperCase();
  const quantity = input.quantity ?? 1;
  const sourceCommentId = input.sourceCommentId.trim();
  const customerFbId = input.customerFbId.trim();
  const size = input.size?.trim().toUpperCase() || null;
  const color = input.color?.trim().toUpperCase() || null;
  
  
  if (!productCode) {
    return { success: false, message: "Code produit manquant." };
  }

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    return {
      success: false,
      message: "La quantité doit être un entier positif.",
    };
  }

  if (!customerFbId || !sourceCommentId) {
    return {
      success: false,
      message: "Identifiant client ou commentaire manquant.",
    };
  }
   let waitlistProductId: string | null = null;
   let waitlistProductVariantId: string | null = null;
  try {
    const order = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { sourceCommentId },
      });

     
      if (existingOrder) {
        throw new Error("DUPLICATE_COMMENT");
      }
       const existingWaitlistEntry = await tx.waitlistEntry.findUnique({
         where: { fbCommentId: sourceCommentId },
        });

            if (existingWaitlistEntry) {
          throw new Error("DUPLICATE_COMMENT");
          }

      const product = await tx.product.findUnique({
        where: { code: productCode },
        include: { variants: true },
      });

      const customer = await tx.customer.upsert({
  where: {
    fbUserId: customerFbId,
  },
  update: {
    name: input.customerName ?? undefined,
  },
  create: {
    fbUserId: customerFbId,
    name: input.customerName ?? null,
  },
});

      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      waitlistProductId = product.id;

      let productVariantId: string | null = null;

      if (product.hasVariants) {
        if (product.variants.length === 0) {
          throw new Error("VARIANTS_NOT_CONFIGURED");
        }

        // Détermine les dimensions réellement utilisées par ce produit.
        const requiresSize = product.variants.some(
          (variant) => variant.size !== null,
        );
        const requiresColor = product.variants.some(
          (variant) => variant.color !== null,
        );

        if (requiresSize && !size && requiresColor && !color) {
          throw new Error("SIZE_AND_COLOR_REQUIRED");
        }

        if (requiresSize && !size) {
          throw new Error("SIZE_REQUIRED");
        }

        if (requiresColor && !color) {
          throw new Error("COLOR_REQUIRED");
        }

        const variant = product.variants.find(
          (item) =>
            item.size === (requiresSize ? size : null) &&
            item.color === (requiresColor ? color : null),
        );

        if (!variant) {
          throw new Error("VARIANT_NOT_FOUND");
        }
          waitlistProductVariantId = variant.id;
        // Mise à jour atomique du stock de la variante uniquement.
        const stockUpdate = await tx.productVariant.updateMany({
          where: {
            id: variant.id,
            stock: { gte: quantity },
          },
          data: {
            stock: { decrement: quantity },
          },
        });

        if (stockUpdate.count !== 1) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        productVariantId = variant.id;
      } else {
        // Un produit simple utilise exclusivement Product.stock.
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
      }

      const reservationExpiresAt = new Date(
        Date.now() + RESERVATION_HOURS * 60 * 60 * 1000,
      );

      const order = await tx.order.create({
        data: {
          productId: product.id,
          productVariantId,
          quantity,
          customerId: customer.id,
          customerFbId,
          customerName: input.customerName ?? null,
          sourceCommentId,
          reservationHours: RESERVATION_HOURS,
          reservationExpiresAt,
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          productVariantId,
          orderId: order.id,
          type: "RESERVATION",
          quantity: -quantity,
          note: `Réservation de la commande ${order.id}`,
          idempotencyKey: `reservation:${order.id}`,
        },
      });

      return order;
    });

    return {
      success: true,
      message: "Commande créée et stock réservé.",
      order,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
  if (!waitlistProductId) {
    throw error;
  }

  await prisma.waitlistEntry.upsert({
    where: {
      fbCommentId: sourceCommentId,
    },
    update: {},
    create: {
      fbCommentId: sourceCommentId,
      productId: waitlistProductId,
      productVariantId: waitlistProductVariantId,
      quantity,
    },
  });

  return {
    success: false,
    waitlisted: true,
    message: "Stock insuffisant. Votre demande a été ajoutée à la liste d'attente.",
  };
}

    if (error instanceof Error) {
      const messages: Record<string, string> = {
        DUPLICATE_COMMENT: "Ce commentaire a déjà été traité.",
        PRODUCT_NOT_FOUND: "Produit introuvable.",
        VARIANTS_NOT_CONFIGURED:
          "Les variantes de ce produit ne sont pas encore configurées.",
        SIZE_AND_COLOR_REQUIRED:
          "Merci de préciser la taille et la couleur souhaitées.",
        SIZE_REQUIRED: "Merci de préciser la taille souhaitée.",
        COLOR_REQUIRED: "Merci de préciser la couleur souhaitée.",
        VARIANT_NOT_FOUND:
          "Cette combinaison de taille et de couleur n'existe pas.",
        INSUFFICIENT_STOCK:
          "Cette variante ou ce produit n'a plus assez de stock.",
      };

      if (messages[error.message]) {
        return {
          success: false,
          duplicate: error.message === "DUPLICATE_COMMENT",
          message: messages[error.message],
        };
      }
    }

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

    throw error;
  }
}


export async function confirmOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();

    const order = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return {
        success: false,
        message: "Commande introuvable.",
      };
    }

    if (
      !order.reservationExpiresAt ||
      order.reservationExpiresAt <= now
    ) {
      return {
        success: false,
        message:
          "Cette réservation est expirée ou ne possède pas de date d'expiration.",
      };
    }

    if (order.status !== "PENDING") {
      return {
        success: false,
        message: "Seules les commandes en attente peuvent être confirmées.",
      };
    }

    const updated = await tx.order.updateMany({
      where: {
        id: orderId,
        status: "PENDING",
        reservationExpiresAt: {
          gt: now,
        },
      },
      data: {
        status: "CONFIRMED",
      },
    });

    if (updated.count !== 1) {
      return {
        success: false,
        message: "La commande a déjà été modifiée.",
      };
    }

    // Si la commande provient de la liste d'attente,
// marquer l'entrée comme définitivement satisfaite.
await tx.waitlistEntry.updateMany({
  where: {
    orderId: order.id,
    status: {
      in: ["RESERVED", "NOTIFIED"],
    },
  },
  data: {
    status: "FULFILLED",
  },
});

    return {
      success: true,
      message: "Commande confirmée.",
    };
  });
}


export async function cancelOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return {
        success: false,
        message: "Commande introuvable.",
      };
    }

    if (order.status !== "PENDING") {
      return {
        success: false,
        message: "Seules les commandes en attente peuvent être annulées.",
      };
    }

    const releasedAt = new Date();

    const updated = await tx.order.updateMany({
      where: {
        id: orderId,
        status: "PENDING",
        stockReleasedAt: null,
      },
      data: {
        status: "CANCELLED",
        stockReleasedAt: releasedAt,
      },
    });

    if (updated.count !== 1) {
      return {
        success: false,
        message: "La commande a déjà été modifiée ou son stock restitué.",
      };
    }

    if (order.productVariantId) {
      // Restitution au stock de la variante commandée.
      await tx.productVariant.update({
        where: { id: order.productVariantId },
        data: {
          stock: { increment: order.quantity },
        },
      });
    } else {
      // Restitution au stock du produit simple.
      await tx.product.update({
        where: { id: order.productId },
        data: {
          stock: { increment: order.quantity },
        },
      });
    }

    await tx.stockMovement.create({
      data: {
        productId: order.productId,
        productVariantId: order.productVariantId,
        orderId: order.id,
        type: "RELEASE",
        quantity: order.quantity,
        note: `Restitution après annulation de la commande ${order.id}`,
        idempotencyKey: `release:${order.id}`,
      },
    });
      
      // Annuler l'entrée de liste d'attente liée à cette commande.
await tx.waitlistEntry.updateMany({
  where: {
    orderId: order.id,
    status: {
      in: ["RESERVED", "NOTIFIED"],
    },
  },
  data: {
    status: "CANCELLED",
  },
});

// Réserver le stock libéré au prochain client prioritaire.
await reserveNextWaitlistEntryTx(
  tx,
  order.productId,
  order.productVariantId,
);

    return {
      success: true,
      message: "Commande annulée et stock restitué.",
    };
  });
}
