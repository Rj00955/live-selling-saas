import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { UserRole } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../config/db.js";

export const AUTH_COOKIE = "tiako_token";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

declare module "fastify" {
  interface FastifyRequest {
    authUser: AuthUser | null;
  }
}

// À appeler une seule fois, directement sur l'instance racine de Fastify.
export async function registerAuth(app: FastifyInstance) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET manquant ou trop court (32 caractères minimum)");
  }

  await app.register(cookie);
  await app.register(jwt, {
    secret,
    cookie: { cookieName: AUTH_COOKIE, signed: false },
  });
  app.decorateRequest("authUser", null);
}

// Vérifie le cookie, puis relit l'utilisateur en base : un compte
// désactivé ou un rôle modifié prend effet immédiatement.
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Non authentifié" });
  }

  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return reply.code(401).send({ error: "Non authentifié" });
  }

  request.authUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

// À utiliser après `authenticate` : requireRole("ADMIN", "SELLER")
export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.authUser || !roles.includes(request.authUser.role)) {
      return reply.code(403).send({ error: "Accès refusé" });
    }
  };
}