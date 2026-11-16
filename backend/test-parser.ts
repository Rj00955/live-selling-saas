import { classifyComment } from "./src/order-parser.js";

const comments = [
  "Je prends A1",
  "Je prends 2 A1",
  "2x A1",
  "A1 x 2",
  "Je prends 5",
  "Prix A1 ?",
  "Annule A1",
];

for (const comment of comments) {
  console.log(comment, "=>", classifyComment(comment));
}