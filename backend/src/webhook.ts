import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { prisma } from "./db.js";

export async function webhookRoutes(app: FastifyInstance) {
  // Garde le corps brut pour pouvoir vérifier la signature
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_req, body, done) => done(null, body)
  );

  // Vérification demandée par Meta lors de la configuration
  app.get("/webhook", async (req, reply) => {
    const q = req.query as Record<string, string>;

    if (
      q["hub.mode"] === "subscribe" &&
      q["hub.verify_token"] === process.env.META_VERIFY_TOKEN
    ) {
      return reply.type("text/plain").send(q["hub.challenge"]);
    }

    return reply.code(403).send("Forbidden");
  });

  // Réception et enregistrement des événements
  app.post("/webhook", async (req, reply) => {
    const raw = req.body as Buffer;
    const secret = process.env.META_APP_SECRET;

    if (secret) {
      const signature = req.headers["x-hub-signature-256"];
      const expected =
        "sha256=" +
        crypto.createHmac("sha256", secret).update(raw).digest("hex");

      const valid =
        typeof signature === "string" &&
        signature.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

      if (!valid) {
        return reply.code(401).send("Invalid signature");
      }
    }

    try {
      const payload = JSON.parse(raw.toString("utf8"));

      if (payload.object === "page" && Array.isArray(payload.entry)) {
        for (const entry of payload.entry) {
          if (!Array.isArray(entry.changes)) continue;

          for (const change of entry.changes) {
            const value = change.value;

            // Nous ne traitons que les nouveaux commentaires
            if (
              change.field !== "feed" ||
              value?.item !== "comment" ||
              value?.verb !== "add" ||
              !value?.comment_id ||
              typeof value?.message !== "string" ||
              !value?.from?.id
            ) {
              continue;
            }

            await prisma.comment.upsert({
              where: {
                fbCommentId: String(value.comment_id),
              },
              update: {
                message: value.message,
                userName: value.from.name ?? null,
              },
              create: {
                fbCommentId: String(value.comment_id),
                fbUserId: String(value.from.id),
                userName: value.from.name ?? null,
                message: value.message,
              },
            });
          }
        }
      }

      req.log.info("Webhook event processed");
      return reply.code(200).send("EVENT_RECEIVED");
    } catch (error) {
      req.log.error({ error }, "Failed to process webhook event");
      return reply.code(500).send("Webhook processing failed");
    }
  });
}