
import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyComment,
  extractOrderDetails,
  extractProductCode,
} from "./order-parser.js";

test("Haka A1 est reconnu comme un achat", () => {
  const result = classifyComment("Haka A1");

  assert.equal(result.intent, "PURCHASE");
  assert.equal(result.productCode, "A1");
  assert.equal(result.quantity, 1);
});

test("Tsy haka A1 indray est reconnu comme une annulation", () => {
  const result = classifyComment("Tsy haka A1 indray");

  assert.equal(result.intent, "CANCEL");
  assert.equal(result.productCode, "A1");
});

test("Maka 2 #A1 ne doit pas être reconnu comme un achat", () => {
  const result = classifyComment("Maka 2 #A1");
  assert.notEqual(result.intent, "PURCHASE");
});

test("Une annulation ne doit pas produire de code de commande", () => {
  assert.equal(extractProductCode("Tsy haka A1 indray"), null);

  const result = extractOrderDetails("Tsy haka A1 indray");
  assert.equal(result.productCode, null);
});

test("Haka sans code produit est un achat incomplet", () => {
  const result = classifyComment("Haka");

  assert.equal(result.intent, "PURCHASE_INCOMPLETE");
  assert.equal(result.productCode, null);
});
test("Haka 2 #A1 est reconnu comme un achat de 2 unités", () => {
  const result = classifyComment("Haka 2 #A1");
  assert.equal(result.intent, "PURCHASE");
  assert.equal(result.productCode, "A1");
  assert.equal(result.quantity, 2);
});

test("Haka A1 taille M couleur noir extrait les variantes", () => {
  const result = classifyComment("Haka A1 taille M couleur noir");

  assert.equal(result.intent, "PURCHASE");
  assert.equal(result.productCode, "A1");
  assert.equal(result.size, "M");
  assert.equal(result.color, "NOIR");
});

test("Haka A1 M noir reconnaît le format court", () => {
  const result = classifyComment("Haka A1 M noir");

  assert.equal(result.intent, "PURCHASE");
  assert.equal(result.size, "M");
  assert.equal(result.color, "NOIR");
});

test("Haka 2 A1 M noir extrait la quantité et les variantes", () => {
  const result = classifyComment("Haka 2 A1 M noir");

  assert.equal(result.intent, "PURCHASE");
  assert.equal(result.productCode, "A1");
  assert.equal(result.quantity, 2);
  assert.equal(result.size, "M");
  assert.equal(result.color, "NOIR");
});
test("Maka aho A1 est reconnu comme un achat", () => {
  assert.equal(classifyComment("Maka aho A1").intent, "PURCHASE");
});

test("Alaina A1 est reconnu comme un achat", () => {
  assert.equal(classifyComment("Alaina A1").intent, "PURCHASE");
});

test("Maka aho A1 mbola misy est reconnu comme un achat", () => {
  assert.equal(
    classifyComment("Maka aho A1 mbola misy?").intent,
    "PURCHASE"
  );
});

test("Mbola misy A1 est une demande de disponibilité", () => {
  assert.equal(
    classifyComment("Mbola misy A1?").intent,
    "AVAILABILITY"
  );
});

test("Prix A1 est une demande de prix", () => {
  assert.equal(classifyComment("Prix A1?").intent, "PRICE");
});
test("Maka aho 2 A1 M mainty extrait correctement les informations", () => {
  const result = classifyComment("Maka aho 2 A1 M mainty");

  assert.equal(result.intent, "PURCHASE");
  assert.equal(result.productCode, "A1");
  assert.equal(result.quantity, 2);
  assert.equal(result.size, "M");
  assert.equal(result.color, "NOIR");
});

test("Je prends 2 A1 taille M noir extrait correctement les informations", () => {
  const result = classifyComment("Je prends 2 A1 taille M noir");

  assert.equal(result.intent, "PURCHASE");
  assert.equal(result.productCode, "A1");
  assert.equal(result.quantity, 2);
  assert.equal(result.size, "M");
  assert.equal(result.color, "NOIR");
});

test("Haka 3 A1 XL fotsy extrait la quantité, la taille et la couleur", () => {
  const result = classifyComment("Haka 3 A1 XL fotsy");

  assert.equal(result.intent, "PURCHASE");
  assert.equal(result.productCode, "A1");
  assert.equal(result.quantity, 3);
  assert.equal(result.size, "XL");
  assert.equal(result.color, "BLANC");
});

test("Maka aho A1 mainty sans quantité utilise une unité", () => {
  const result = classifyComment("Maka aho A1 mainty");

  assert.equal(result.intent, "PURCHASE");
  assert.equal(result.quantity, 1);
  assert.equal(result.color, "NOIR");
});
test("JP A1 est reconnu comme un achat", () => {
  const result = classifyComment("JP A1");

  assert.equal(result.intent, "PURCHASE");
  assert.equal(result.productCode, "A1");
  assert.equal(result.quantity, 1);
});

test("Jp A1 est reconnu comme un achat", () => {
  const result = classifyComment("Jp A1");

  assert.equal(result.intent, "PURCHASE");
  assert.equal(result.productCode, "A1");
  assert.equal(result.quantity, 1);
});
test("JP sans code produit ne doit pas créer une commande", () => {
  const result = classifyComment("JP");

  assert.notEqual(result.intent, "PURCHASE");
});
test("Maka aho A1 pointure 42 extrait la pointure", () => {
  const result = classifyComment("Maka aho A1 pointure 42");

  assert.equal(result.intent, "PURCHASE");
  assert.equal(result.productCode, "A1");
  assert.equal(result.size, "42");
});

test("Haka A1 taille 38 extrait la pointure", () => {
  const result = classifyComment("Haka A1 taille 38");

  assert.equal(result.intent, "PURCHASE");
  assert.equal(result.productCode, "A1");
  assert.equal(result.size, "38");
});

test("Maka aho 2 A1 pointure 43 mainty", () => {
  const result = classifyComment("Maka 2 aho A1 pointure 43 mainty");

  assert.equal(result.intent, "PURCHASE");
  assert.equal(result.productCode, "A1");
  assert.equal(result.quantity, 2);
  assert.equal(result.size, "43");
  assert.equal(result.color, "NOIR");
});