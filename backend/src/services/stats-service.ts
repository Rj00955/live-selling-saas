import { prisma } from "../config/db.js";

const DAY_MS = 24 * 60 * 60 * 1000;
export const STATS_WINDOW_DAYS = 7;

// Variation en pourcentage entre deux périodes.
// Renvoie null quand la période précédente est vide : aucun pourcentage n'est inventé.
function trend(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getDashboardStats(now = new Date()) {
  const currentStart = new Date(now.getTime() - STATS_WINDOW_DAYS * DAY_MS);
  const previousStart = new Date(now.getTime() - 2 * STATS_WINDOW_DAYS * DAY_MS);
  const notCancelled = { status: { not: "CANCELLED" as const } };

  const [
    ordersTotal,
    ordersCurrent,
    ordersPrevious,
    customersTotal,
    customersCurrent,
    customersPrevious,
    paidOrders,
  ] = await Promise.all([
    prisma.order.count({ where: notCancelled }),
    prisma.order.count({
      where: { ...notCancelled, createdAt: { gte: currentStart } },
    }),
    prisma.order.count({
      where: {
        ...notCancelled,
        createdAt: { gte: previousStart, lt: currentStart },
      },
    }),
    prisma.customer.count(),
    prisma.customer.count({ where: { createdAt: { gte: currentStart } } }),
    prisma.customer.count({
      where: { createdAt: { gte: previousStart, lt: currentStart } },
    }),
    prisma.order.findMany({
      where: { status: "PAID" },
      select: {
        createdAt: true,
        quantity: true,
        product: { select: { price: true } },
      },
    }),
  ]);

  let revenueTotal = 0;
  let revenueCurrent = 0;
  let revenuePrevious = 0;

  for (const order of paidOrders) {
    const amount = order.quantity * order.product.price;
    revenueTotal += amount;

    if (order.createdAt >= currentStart) {
      revenueCurrent += amount;
    } else if (order.createdAt >= previousStart) {
      revenuePrevious += amount;
    }
  }

  return {
    periodDays: STATS_WINDOW_DAYS,
    orders: {
      total: ordersTotal,
      trend: trend(ordersCurrent, ordersPrevious),
    },
    customers: {
      total: customersTotal,
      trend: trend(customersCurrent, customersPrevious),
    },
    revenue: {
      total: revenueTotal,
      trend: trend(revenueCurrent, revenuePrevious),
    },
  };
}