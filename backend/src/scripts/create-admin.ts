import "dotenv/config";
import type { UserRole } from "@prisma/client";
import { prisma } from "../config/db.js";
import { hashPassword } from "../auth/password.js";

const ROLES: UserRole[] = ["ADMIN", "SELLER", "STOCK_MANAGER"];

function databaseName(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL n'est pas définie");
  return new URL(url).pathname.replace(/^\//, "");
}

async function main() {
  const target = databaseName();

  // Garde-fou : la base visée doit être confirmée explicitement.
  if (process.env.CONFIRM_DB !== target) {
    throw new Error(
      `Base visée : "${target}". Définissez CONFIRM_DB="${target}" pour confirmer.`,
    );
  }

  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const role = (process.env.USER_ROLE ?? "ADMIN").trim().toUpperCase() as UserRole;

  if (!name || !email || !password) {
    throw new Error("ADMIN_NAME, ADMIN_EMAIL et ADMIN_PASSWORD sont requis");
  }
  if (!ROLES.includes(role)) {
    throw new Error(`USER_ROLE doit être l'un de : ${ROLES.join(", ")}`);
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("ADMIN_EMAIL n'est pas une adresse valide");
  }
  if (password.length < 12) {
    throw new Error("Le mot de passe doit contenir au moins 12 caractères");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Un compte existe déjà pour cet e-mail (base "${target}") : aucune modification.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role,
    },
    select: { id: true, email: true, role: true },
  });

  console.log(`Utilisateur créé dans "${target}" : ${user.email} (${user.role})`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());