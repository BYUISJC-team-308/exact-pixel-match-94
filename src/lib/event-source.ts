// Only promote canonical Handshake event URLs from reviewed source metadata.
export function handshakeEventUrl(details?: string): string | undefined {
  return details?.match(
    /(?:^|\n)Source: (https:\/\/byu\.joinhandshake\.com\/stu\/events\/\d+)(?=\s|$)/,
  )?.[1];
}
