export type CommentIntent =
  | "PURCHASE"
  | "PURCHASE_INCOMPLETE"
  | "PRICE"
  | "AVAILABILITY"
  | "VARIANT"
  | "DELIVERY"
  | "MESSENGER"
  | "REACTION"
  | "CANCEL"
  | "UNCLEAR";

export type ParsedComment = {
  intent: CommentIntent;
  productCode: string | null;
  quantity: number;
};

export function classifyComment(message: string): ParsedComment {
  const text = message.toUpperCase().trim();

  // Recherche d'un code produit : A1, V1, C3, #A1...
  const codeMatch = text.match(
    /(?:^|[\s#])([A-Z]\d+)(?=$|[\s.,!?])/,
  );

  const productCode = codeMatch?.[1] ?? null;

  let quantity = 1;

  if (productCode) {
    const codeStart = text.indexOf(productCode);
    const beforeCode = text.slice(0, codeStart);
    const afterCode = text.slice(codeStart + productCode.length);

    // Exemple : "2 A1" ou "2x A1"
    const beforeMatch = beforeCode.match(
      /(\d+)\s*(?:X\s*)?$/,
    );

    // Exemple : "A1 x 2" ou "A1 × 2"
    const afterMatch = afterCode.match(
      /^\s*(?:X|×)\s*(\d+)\b/,
    );

    const quantityMatch = afterMatch ?? beforeMatch;

    if (quantityMatch) {
      quantity = Number(quantityMatch[1]);
    }
  }

  const safeQuantity =
    Number.isSafeInteger(quantity) && quantity > 0
      ? quantity
      : 1;

  const result = (
    intent: CommentIntent,
    parsedQuantity = safeQuantity,
  ): ParsedComment => ({
    intent,
    productCode,
    quantity: parsedQuantity,
  });

  // 1. Annulation
  if (
    /\b(ANNUL\w*|CANCEL\w*|TSY MILA|NE PRENDS PLUS)\b/.test(text)
  ) {
    return result("CANCEL");
  }

  // 2. Question sur le prix
  if (
    /\b(OHATRINONA|PRIX|COMBIEN|ARIARY|PRICE)\b/.test(text)
  ) {
    return result("PRICE");
  }

  // 3. Disponibilité et stock
  if (
    /\b(MBOLA MISY|MISY|DISPONIBLE|DISPO|STOCK|ENCORE)\b/.test(text)
  ) {
    return result("AVAILABILITY");
  }

  // 4. Taille, couleur et variantes
  if (
    /\b(TAILLE|SIZE|POINTURE|COULEUR|LOKO|COLOR|NOIR|BLANC|ROUGE|XL|XXL)\b/.test(text)
  ) {
    return result("VARIANT");
  }

  // 5. Livraison
  if (
    /\b(LIVRAISON|MANDEFA|ALEFA|EXPEDITION|DELIVERY|TOAMASINA|TANA)\b/.test(text)
  ) {
    return result("DELIVERY");
  }

  // 6. Demande de contact privé
  if (
    /\b(INBOX|MP|MESSAGE PRIVE|MESSENGER|EN PRIVE)\b/.test(text)
  ) {
    return result("MESSENGER");
  }

  // 7. Intention d'achat explicite
  const purchaseIntent =
    /\b(JE PRENDS|JE PREND|JP|MAKA|OMEO|RAISO|RESERVE|RESERVER|COMMANDE|COMMANDER|ACHETE|ACHETER)\b/.test(text);

  if (purchaseIntent) {
    if (productCode) {
      return result("PURCHASE");
    }

    // Exemple : "Je prends 5" : intention détectée,
    // mais le code produit manque.
    const numberMatch = text.match(/(\d+)\s*$/);
    const requestedQuantity = numberMatch
      ? Number(numberMatch[1])
      : 1;

    const validQuantity =
      Number.isSafeInteger(requestedQuantity) &&
      requestedQuantity > 0
        ? requestedQuantity
        : 1;

    return result("PURCHASE_INCOMPLETE", validQuantity);
  }

   // 8. Formats courts : "A1", "2x A1", "A1 x 2"
  if (
    productCode &&
    /^\s*(?:\d+\s*X?\s*#?[A-Z]\d+|#?[A-Z]\d+\s*(?:X|×)\s*\d+)\s*[.!?]*\s*$/.test(text)
  ) {
    return result("PURCHASE");
  }

  // 9. Réactions simples
  if (
    /\b(TSARA|BEAU|BELLE|MAGNIFIQUE|SUPER|JOLI|JOLIE|LOVE)\b/.test(text) ||
    /❤️|😍|👍|👏|🔥/.test(text)
  ) {
    return result("REACTION");
  }

  return result("UNCLEAR");
}

export function extractOrderDetails(message: string): {
  productCode: string | null;
  quantity: number;
} {
  const parsed = classifyComment(message);

  return {
    productCode:
      parsed.intent === "PURCHASE" ? parsed.productCode : null,
    quantity: parsed.quantity,
  };
}

export function extractProductCode(message: string): string | null {
  const parsed = classifyComment(message);

  return parsed.intent === "PURCHASE"
    ? parsed.productCode
    : null;
}