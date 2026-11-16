
import { prisma } from "./db.js";

export async function getCustomers() {
  return prisma.customer.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          orders: true,
          comments: true,
        },
      },
    },
  });
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          product: {
            select: {
              code: true,
              name: true,
              price: true,
            },
          },
        },
      },
      _count: {
        select: {
          comments: true,
        },
      },
    },
  });
}
