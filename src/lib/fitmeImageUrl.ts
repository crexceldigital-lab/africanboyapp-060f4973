/** Resolve catalogue site paths before sending them to the image provider. */
export function fitmeImageUrl(imageUrl: string, origin: string): string {
  const url = new URL(imageUrl, origin);
  if (!['https:', 'http:', 'data:'].includes(url.protocol)) {
    throw new Error('This product image cannot be used for try-on. Please choose another product.');
  }
  return url.href;
}