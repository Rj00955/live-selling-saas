export function extractProductCode(message: string): string | null {
  const normalizedMessage = message.toUpperCase().trim();

  const match = normalizedMessage.match(
    /(?:^|\s)#?([A-Z]\d+)(?=$|\s|[.,!?])/,
  );

  return match ? match[1] : null;
}