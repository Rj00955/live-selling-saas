
export type CommentIntent =
  | "PURCHASE"
  | "PURCHASE_INCOMPLETE"
  | "INVALID_QUANTITY"
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
  size: string | null;
  color: string | null;
};

const SIZE_PATTERN =
  /\b(XXXL|XXL|2XL|3XL|XL|XS|S|M|L)\b/;

const COLOR_ALIASES: Record<string, string> = {
  NOIR: "NOIR",
  NOIRE: "NOIR",
  MAINTY: "NOIR",
  BLANC: "BLANC",
  BLANCHE: "BLANC",
  FOTSY: "BLANC",
  ROUGE: "ROUGE",
  MENA: "ROUGE",
  BLEU: "BLEU",
  BLEUE: "BLEU",
  MANGA: "BLEU",
  VERT: "VERT",
  VERTE: "VERT",
  JAUNE: "JAUNE",
  ROSE: "ROSE",
  GRIS: "GRIS",
  GRISE: "GRIS",
  MARRON: "MARRON",
  BEIGE: "BEIGE",
  VIOLET: "VIOLET",
  ORANGE: "ORANGE",
};

function extractSize(text: string): string | null {
  // Tailles vestimentaires avec libellé
  const labeled = text.match(
    /\b(?:TAILLE|SIZE)\s*[:=]?\s*(XXXL|XXL|2XL|3XL|XL|XS|S|M|L)\b/,
  );

  if (labeled) return labeled[1];

  // Pointures avec libellé
  const shoeSize = text.match(
    /\b(?:POINTURE|POINT|SHOE SIZE)\s*[:=]?\s*(3[5-9]|4[0-7])\b/,
  );

  if (shoeSize) return shoeSize[1];

  // Format court : "Haka A1 M noir"
  const compact = text.match(
    /(?:^|\s)(XXXL|XXL|2XL|3XL|XL|XS|S|M|L)(?=\s|$)/,
  );

  if (compact) return compact[1];

  // Pointure numérique sans libellé
  const compactShoeSize = text.match(
    /(?:^|\s)(3[5-9]|4[0-7])(?=\s|$)/,
  );

  return compactShoeSize?.[1] ?? null;
}

function extractColor(text: string): string | null {
  const labeled = text.match(
    /\b(?:COULEUR|COLOR|LOKO)\s*[:=]?\s*([A-ZÀ-Ÿ]+)\b/,
  );

  if (labeled) {
    return COLOR_ALIASES[labeled[1]] ?? null;
  }

  const words = text.match(/[A-ZÀ-Ÿ]+/g) ?? [];

  for (const word of words) {
    if (COLOR_ALIASES[word]) {
      return COLOR_ALIASES[word];
    }
  }

  return null;
}

export function classifyComment(message: string): ParsedComment {
  const text = message
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const codeMatch = text.match(
  /(?:^|[\s#])([A-Z][A-Z0-9]*\d+)(?=$|[\s.,!?])/,
);

  const productCode = codeMatch?.[1] ?? null;

   let quantity = 1;

  if (productCode) {
    const codeStart = text.indexOf(productCode);
    const beforeCode = text.slice(0, codeStart);
    const afterCode = text.slice(codeStart + productCode.length);

    const beforeMatch = beforeCode.match(
      /([+-]?\d+(?:[.,]\d+)?)\s*(?:X\s*)?(?:AHO\s*)?#?\s*$/,
    );

    const afterMatch = afterCode.match(
      /^\s*(?:X|×)\s*([+-]?\d+(?:[.,]\d+)?)/,
    );

    const quantityMatch = afterMatch ?? beforeMatch;

    if (quantityMatch) {
      quantity = Number(quantityMatch[1].replace(",", "."));
    }
  }

    const validQuantity =
    Number.isSafeInteger(quantity) && quantity > 0;

  const safeQuantity = validQuantity ? quantity : 1;

  const size = extractSize(text);
  const color = extractColor(text);

  const result = (
    intent: CommentIntent,
    parsedQuantity = safeQuantity,
  ): ParsedComment => ({
    intent,
    productCode,
    quantity: parsedQuantity,
    size,
    color,
  });
      

  // 1. Annulation
  if (
    /\b(ANNUL\w*|CANCEL\w*|TSY\s+MILA|TSY\s+HAKA|NE PRENDS PLUS)\b/.test(text)
  ) {
    return result("CANCEL");
  }

  const purchaseIntent =
  /\b(JE PRENDS|JE PREND|JP|MAKA\s+(?:\d+\s+)?AHO|ALAINA|HAKA|OMEO|RAISO|RESERVE|RESERVER|COMMANDE|COMMANDER|ACHETE|ACHETER)\b/.test(text);
   
      if (purchaseIntent && productCode) {
    return validQuantity
      ? result("PURCHASE")
      : result("INVALID_QUANTITY", quantity);
  }
  
  // 2. Prix
  if (/\b(OHATRINONA|PRIX|COMBIEN|ARIARY|PRICE)\b/.test(text)) {
    return result("PRICE");
  }

  

  // 3. Livraison
  if (
    /\b(LIVRAISON|MANDEFA|ALEFA|EXPEDITION|DELIVERY|TOAMASINA|TANA)\b/.test(text)
  ) {
    return result("DELIVERY");
  }

  // 4. Messenger
  if (
    /\b(INBOX|MP|MESSAGE PRIVE|MESSENGER|EN PRIVE)\b/.test(text)
  ) {
    return result("MESSENGER");
  }

  // 5. Achat explicite : priorité sur la détection des variantes
  
    if (purchaseIntent && productCode && !validQuantity) {
    return result("INVALID_QUANTITY", quantity);
  }
  
     if (purchaseIntent) {
    if (productCode) {
      return result("PURCHASE");
    }

    const numberMatch = text.match(
      /([+-]?\d+(?:[.,]\d+)?)\s*$/,
    );

    const hasExplicitQuantity = Boolean(numberMatch);

    const requestedQuantity = numberMatch
      ? Number(numberMatch[1].replace(",", "."))
      : 1;

    const isRequestedQuantityValid =
      Number.isSafeInteger(requestedQuantity) &&
      requestedQuantity > 0;

    if (hasExplicitQuantity && !isRequestedQuantityValid) {
      return result("INVALID_QUANTITY", requestedQuantity);
    }

    return result("PURCHASE_INCOMPLETE", requestedQuantity);
  }
    // 6. Disponibilité
  if (
    /\b(MBOLA MISY|MISY|DISPONIBLE|DISPO|STOCK|ENCORE)\b/.test(text)
  ) {
    return result("AVAILABILITY");
  }
  // 7. Demande de variante sans intention d'achat
  if (
    size ||
    color ||
    /\b(TAILLE|SIZE|POINTURE|COULEUR|LOKO|COLOR)\b/.test(text)
  ) 
     
  {
    return result("VARIANT");
  }

  // 8. Formats courts
  if (
    productCode &&
    /^\s*(?:\d+\s*X?\s*#?[A-Z]\d+|#?[A-Z]\d+\s*(?:X|×)\s*\d+)\s*[.!?]*\s*$/.test(text)
  ) {
    return result("PURCHASE");
  }

  // 9. Réactions
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
