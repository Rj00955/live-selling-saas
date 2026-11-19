import { classifyComment } from "../parsers/order-parser.js";

const tests = [
  "Maka 2 #A1",
  "Je prends #A1",
  "2x A1",
  "Ohatrinona A1 ?",
  "Mbola misy A1 ve ?",
  "Misy taille M ve amin'ny A1 ?",
  "Livraison à Toamasina ?",
  "Alefaso inbox",
  "Tsara be ❤️",
  "Tsy mila A1 intsony",
  "A1",
];

for (const message of tests) {
  console.log(message, "=>", classifyComment(message));
}