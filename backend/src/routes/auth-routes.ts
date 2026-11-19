import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { AUTH_COOKIE, authenticate } from "../auth/auth-guard.js";
import { hashPassword, verifyPassword } from "../auth/password.js";

const SESSION_SECONDS = 8 * 60 * 60;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
});

// Hash factice, calculé une seule fois : il sert à dépenser le même temps
// de calcul quand l'e-mail n'existe pas, pour ne pas révéler quels comptes existent.
let dummyHash: Promise<string> | null = null;
function getDummyHash() {
  dummyHash ??= hashPassword("mot-de-passe-factice");
  return dummyHash;
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Identifiants invalides" });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    const passwordOk = await verifyPassword(
      password,
      user ? user.passwordHash : await getDummyHash(),
    );

    if (!user || !passwordOk || !user.isActive) {
      return reply.code(401).send({ error: "Identifiants incorrects" });
    }

    const token = app.jwt.sign(
      { sub: user.id },
      { expiresIn: SESSION_SECONDS },
    );

    reply.setCookie(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_SECONDS,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  });

  app.get("/auth/me", { preHandler: authenticate }, async (request) => {
    return { user: request.authUser };
  });

  app.post("/auth/logout", async (_request, reply) => {
    reply.clearCookie(AUTH_COOKIE, { path: "/" });
    return { success: true };
  });
}