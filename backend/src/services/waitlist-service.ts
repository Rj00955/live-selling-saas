
import type { Prisma } from "@prisma/client";

const RESERVATION_HOURS = 24;

/**
 * Reserves stock for the first eligible customer.
 * Must be called inside a Prisma transaction.
 *
 * One entry is processed per call.
 * RESERVED and NOTIFIED entries block the queue.
 * FIFO is strict: never skip the oldest WAITING entry.
 */
export async function reserveNextWaitlistEntryTx(
  tx: Prisma.TransactionClient,
  productId: string,
  productVariantId: string | null,
) {
  // An existing reservation or notification blocks the queue.
  const activeEntry = await tx.waitlistEntry.findFirst({
    where: {
      productId,
      productVariantId,
      status: {
        in: ["RESERVED", "NOTIFIED"],
      },
    },
    select: {
      id: true,
    },
  });

  if (activeEntry) return null;

  // Get the oldest waiting entry.
  const entry = await tx.waitlistEntry.findFirst({
    where: {
      productId,
      productVariantId,
      status: "WAITING",
    },
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" },
    ],
    include: {
      comment: true,
    },
  });

  if (!entry) return null;

  // Claim the entry to prevent duplicate processing.
  const claimed = await tx.waitlistEntry.updateMany({
    where: {
      id: entry.id,
      status: "WAITING",
    },
    data: {
      status: "RESERVED",
    },
  });

  if (claimed.count !== 1) return null;

  // Atomically check and decrement stock.
  const stockUpdate = productVariantId
    ? await tx.productVariant.updateMany({
        where: {
          id: productVariantId,
          productId,
          stock: { gte: entry.quantity },
        },
        data: {
          stock: { decrement: entry.quantity },
        },
      })
    : await tx.product.updateMany({
        where: {
          id: productId,
          stock: { gte: entry.quantity },
        },
        data: {
          stock: { decrement: entry.quantity },
        },
      });

  // Strict FIFO: do not skip the oldest customer.
  if (stockUpdate.count !== 1) {
    await tx.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: "WAITING" },
    });

    return null;
  }

  // Start the 24-hour countdown when stock is actually allocated.
  const reservationExpiresAt = new Date(
    Date.now() + RESERVATION_HOURS * 60 * 60 * 1000,
  );

  const order = await tx.order.create({
    data: {
      productId,
      productVariantId,
      quantity: entry.quantity,
      customerFbId: entry.comment.fbUserId,
      customerName: entry.comment.userName,
      customerId: entry.comment.customerId,
      liveSessionId: entry.comment.liveSessionId,
      sourceCommentId: entry.fbCommentId,
      reservationHours: RESERVATION_HOURS,
      reservationExpiresAt,
    },
  });

  // Record the stock reservation.
  await tx.stockMovement.create({
    data: {
      productId,
      productVariantId,
      orderId: order.id,
      type: "RESERVATION",
      quantity: -entry.quantity,
      note: `Waitlist reservation ${entry.id}`,
      idempotencyKey: `waitlist-reservation:${entry.id}`,
    },
  });

  // Link the order to the waitlist entry.
  await tx.waitlistEntry.update({
    where: { id: entry.id },
    data: {
      orderId: order.id,
      status: "RESERVED",
    },
  });

  return { entry, order };
}
