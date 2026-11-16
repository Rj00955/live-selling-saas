
require("dotenv").config();

const crypto = require("node:crypto");

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
            comment_id: "TEST_COMMENT_005",
            message: "Je prends 1 TSTV2 M NOIR",
            from: {
              id: "TEST_CLIENT_001",
              name: "Client Test"
            }
          }
        }
      ]
    }
  ]
};

const body = JSON.stringify(payload);

if (!process.env.META_APP_SECRET) {
  console.error("META_APP_SECRET introuvable dans .env");
  process.exit(1);
}

const signature =
  "sha256=" +
  crypto
    .createHmac("sha256", process.env.META_APP_SECRET)
    .update(body)
    .digest("hex");

fetch("http://localhost:4000/webhook", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-hub-signature-256": signature
  },
  body
})
  .then(async (response) => {
    console.log("HTTP", response.status);
    console.log(await response.text());
  })
  .catch(console.error);
