
import { prisma } from "../config/db.js";
import { reserveNextWaitlistEntryTx } from "./waitlist-service.js";
export async function expireReservations() {
  const now = new Date();

  // Récupérer les commandes dont la réservation est expirée.
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: "PENDING",
      reservationExpiresAt: {
        lte: now,
      },
      stockReleasedAt: null,
    },
  });

  let expiredCount = 0;

  for (const order of expiredOrders) {
    try {
      const expired = await prisma.$transaction(async (tx) => {
        // Une seule instance peut expirer cette commande.
        const updated = await tx.order.updateMany({
          where: {
            id: order.id,
            status: "PENDING",
            stockReleasedAt: null,
            reservationExpiresAt: {
              lte: now,
            },
          },
          data: {
            status: "CANCELLED",
            stockReleasedAt: now,
          },
        });

        // Une autre opération a déjà traité la commande.
        if (updated.count !== 1) {
          return false;
        }

        // Restituer le stock de la variante ou du produit.
        if (order.productVariantId) {
          await tx.productVariant.update({
            where: {
              id: order.productVariantId,
            },
            data: {
              stock: {
                increment: order.quantity,
              },
            },
          });
        } else {
          await tx.product.update({
            where: {
              id: order.productId,
            },
            data: {
              stock: {
                increment: order.quantity,
              },
            },
          });
        }

        // Enregistrer le mouvement de restitution.
        await tx.stockMovement.create({
          data: {
            productId: order.productId,
            productVariantId: order.productVariantId,
            orderId: order.id,
            type: "RELEASE",
            quantity: order.quantity,
            note: `Restitution automatique après expiration de la commande ${order.id}`,
            idempotencyKey: `release:${order.id}`,
          },
        });

        // Annuler l'entrée de liste d'attente liée à la commande expirée.
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

// Réserver le stock libéré au prochain client FIFO.
await reserveNextWaitlistEntryTx(
  tx,
  order.productId,
  order.productVariantId,
);

        return true;
      });

      if (expired) {
        expiredCount++;
      }
    } catch (error) {
      console.error(
        `Erreur lors de l'expiration de la commande ${order.id}:`,
        error,
      );
    }
  }

  return expiredCount;
}

// Éviter plusieurs exécutions simultanées dans cette instance.
let isRunning = false;
let expirationInterval: ReturnType<typeof setInterval> | undefined;

export function startReservationExpirationJob() {
  if (expirationInterval) {
    return () => {};
  }

  const run = async () => {
    if (isRunning) return;

    isRunning = true;

    try {
      console.log("[EXPIRATION] Vérification des réservations...");

      const count = await expireReservations();

      console.log(
        `[EXPIRATION] Vérification terminée. ${count} réservation(s) expirée(s).`,
      );

      if (count > 0) {
        console.log(
          `${count} réservation(s) expirée(s) automatiquement.`,
        );
      }
    } catch (error) {
      console.error("Erreur du service d'expiration :", error);
    } finally {
      isRunning = false;
    }
  };

  // Premier contrôle au démarrage.
  void run();

  // Puis contrôle toutes les minutes.
  expirationInterval = setInterval(() => {
    void run();
  }, 60_000);

  return () => {
    if (expirationInterval) {
      clearInterval(expirationInterval);
      expirationInterval = undefined;
    }
  };
}
