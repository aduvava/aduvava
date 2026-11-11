// The API serves only validated, random-name raster files from private storage.
const IMAGE_NAME = /^store-img-[0-9a-f]{32}\.(?:png|jpe?g|webp|gif)$/;

export function getStoreImageUrl(name: unknown): string | null {
  return typeof name === "string" && IMAGE_NAME.test(name)
    ? "/api/store/images/" + name
    : null;
}

export function storeItemImageFile(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const image = (metadata as Record<string, unknown>).imageFile;
  return getStoreImageUrl(image);
}
