import type { UserRole } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";

const ALL: UserRole[] = ["ADMIN", "SELLER", "STOCK_MANAGER"];

// Matrice d'accès : ressource (1er segment du chemin) -> méthode -> rôles autorisés.
// Toute combinaison absente de cette table est réservée à l'ADMIN.
const POLICY: Record<string, Record<string, UserRole[]>> = {
  products: {
    GET: ALL,
    POST: ["ADMIN", "STOCK_MANAGER"],
    PATCH: ["ADMIN", "STOCK_MANAGER"],
    DELETE: ["ADMIN"],
  },
  orders: {
    GET: ALL,
    PATCH: ["ADMIN", "SELLER"],
  },
  customers: {
    GET: ["ADMIN", "SELLER"],
  },
    stats: {
    GET: ["ADMIN"],
  },
};

// À utiliser après `authenticate`, dans le contexte des routes protégées.
export async function enforceAccess(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (request.method === "OPTIONS") return;

  const pattern = request.routeOptions?.url;
  if (!pattern) return; // route inconnue : Fastify répondra 404

  const resource = pattern.split("/")[1] ?? "";
  const method = request.method === "HEAD" ? "GET" : request.method;
  const allowed = POLICY[resource]?.[method] ?? (["ADMIN"] as UserRole[]);

  if (!request.authUser || !allowed.includes(request.authUser.role)) {
    return reply.code(403).send({ error: "Accès refusé" });
  }
}