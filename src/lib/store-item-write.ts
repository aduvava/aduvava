import { Prisma } from "@prisma/client";

/**
 * Prisma JSON? fields distinguish SQL NULL from a JSON null value.
 * A plain JS null is ambiguous at runtime and can throw a Prisma validation
 * error (500) when creating an EXP shop item with no image/effect.
 */
export function storeItemWriteData(data: Record<string, unknown>): Record<string, unknown> {
  if (!Object.prototype.hasOwnProperty.call(data, "metadata")) return data;
  return data.metadata === null ? { ...data, metadata: Prisma.DbNull } : data;
}
