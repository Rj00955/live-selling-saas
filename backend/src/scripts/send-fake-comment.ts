import "dotenv/config";
import crypto from "node:crypto";

// Envoie un faux commentaire Facebook (signé) au webhook d'un serveur LOCAL.
// Sert uniquement aux tests et aux démonstrations.

const url = process.env.DEMO_WEBHOOK_URL ?? "http://localhost:4000/webhook";
const host = new URL(url).hostname;

// Garde-fou : jamais vers un serveur distant.
if (host !== "localhost" && host !== "127.0.0.1") {
  throw new Error(`Adresse refusée (${host}) : seul localhost est autorisé.`);
}

const secret = process.env.META_APP_SECRET;
if (!secret) throw new Error("META_APP_SECRET n'est pas configuré.");

const message = process.env.COMMENT_TEXT?.trim();
if (!message) {
  throw new Error('COMMENT_TEXT est requis, par exemple "HAKA 2 CODE M NOIR".');
}

const customerName = process.env.CUSTOMER_NAME?.trim() || "Client Demo";
const customerFbId = process.env.CUSTOMER_FB_ID?.trim() || "DEMO_CUSTOMER_1";
const commentId = `DEMO_${Date.now()}`;

const payload = {
  object: "page",
  entry: [
    {
      changes: [
        {
          field: "feed",
          value: {
            item: "comment",
            verb: "add",
            comment_id: commentId,
            message,
            from: { id: customerFbId, name: customerName },
          },
        },
      ],
    },
  ],
};

const rawBody = JSON.stringify(payload);
const signature =
  "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

const response = await fetch(url, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-hub-signature-256": signature,
  },
  body: rawBody,
});

console.log(`Webhook : ${response.status} ${await response.text()}`);
console.log(`Commentaire : "${message}" par ${customerName} (${commentId})`);