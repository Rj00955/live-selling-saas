
import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { prisma } from "../config/db.js";
import { classifyComment } from "../parsers/order-parser.js";
import { createOrderFromComment } from "../services/order-service.js";

export async function webhookRoutes(app: FastifyInstance) {
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_req, body, done) => done(null, body),
  );

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

  app.post("/webhook", async (req, reply) => {
    const raw = req.body as Buffer;
    const secret = process.env.META_APP_SECRET;

    if (!secret) {
      req.log.error("META_APP_SECRET is not configured");
      return reply.code(500).send("Webhook configuration error");
    }

    const signature = req.headers["x-hub-signature-256"];

    const expected =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(raw).digest("hex");

    const valid =
      typeof signature === "string" &&
      signature.length === expected.length &&
      crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected),
      );

    if (!valid) {
      return reply.code(401).send("Invalid signature");
    }

    try {
      const payload = JSON.parse(raw.toString("utf8"));

      if (payload.object === "page" && Array.isArray(payload.entry)) {
        for (const entry of payload.entry) {
          if (!Array.isArray(entry.changes)) continue;

          for (const change of entry.changes) {
            const value = change.value;

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

            const commentId = String(value.comment_id);
            const customerFbId = String(value.from.id);
            const customerName =
              typeof value.from.name === "string"
                ? value.from.name
                : null;
            const message = value.message;

            try {
              // Enregistrer le client ou actualiser ses informations
              const customer = await prisma.customer.upsert({
                where: {
                  fbUserId: customerFbId,
                },
                update: {
                  name: customerName ?? undefined,
                },
                create: {
                  fbUserId: customerFbId,
                  name: customerName,
                },
              });

              // Enregistrer le commentaire et le relier au client
              await prisma.comment.upsert({
                where: {
                  fbCommentId: commentId,
                },
                update: {
                  message,
                  userName: customerName,
                  customerId: customer.id,
                },
                create: {
                  fbCommentId: commentId,
                  fbUserId: customerFbId,
                  userName: customerName,
                  message,
                  customerId: customer.id,
                },
              });

              const parsed = classifyComment(message);

              if (parsed.intent === "INVALID_QUANTITY") {
                req.log.warn(
                  {
                    commentId,
                    message,
                    quantity: parsed.quantity,
                  },
                  "Invalid quantity detected: order not created",
                );
                continue;
              }

              if (
                parsed.intent !== "PURCHASE" ||
                !parsed.productCode
              ) {
                req.log.info(
                  {
                    commentId,
                    message,
                    intent: parsed.intent,
                  },
                  "Comment saved without creating an order",
                );
                continue;
              }

              const {
                productCode,
                quantity,
                size,
                color,
              } = parsed;

              const result = await createOrderFromComment({
                productCode,
                quantity,
                size,
                color,
                customerFbId,
                customerName,
                sourceCommentId: commentId,
              });

              if (result.success && result.order) {
                req.log.info(
                  {
                    commentId,
                    productCode,
                    quantity,
                    size,
                    color,
                    orderId: result.order.id,
                  },
                  "Order created from Facebook comment",
                );
              } else if (
                "duplicate" in result &&
                result.duplicate
              ) {
                req.log.info(
                  { commentId, productCode },
                  "Duplicate comment ignored",
                );
              } else {
                req.log.info(
                  {
                    commentId,
                    productCode,
                    quantity,
                    size,
                    color,
                    message: result.message,
                  },
                  "No order created from Facebook comment",
                );
              }
            } catch (error) {
              req.log.error(
                { error, commentId },
                "Failed to process individual Facebook comment",
              );
              continue;
            }
          }
        }
      }

      return reply.code(200).send("EVENT_RECEIVED");
    } catch (error) {
      req.log.error(
        { error },
        "Failed to process webhook event",
      );

      return reply.code(500).send("Webhook processing failed");
    }
  });
}
