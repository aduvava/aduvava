import { HttpError } from "@/lib/api";
import { RequestBodyTooLargeError } from "@/lib/limited-json";

/** Parse multipart uploads only after bounding streamed bytes.
 * request.formData() without this guard can buffer an arbitrary-size request.
 * The reverse proxy should independently enforce client_max_body_size.
 */
export async function readLimitedFormData(request: Request, maxBytes: number): Promise<FormData> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error("Invalid body size limit");
  const contentType = request.headers.get("content-type") || "";
  if (!/^multipart\/form-data\s*;\s*boundary=/i.test(contentType)) {
    throw new HttpError(415, "Only multipart/form-data is supported");
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > maxBytes) {
    throw new RequestBodyTooLargeError();
  }
  if (!request.body) throw new HttpError(400, "Missing request body");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return await new Request(request.url, {
      method: "POST",
      headers: { "content-type": contentType },
      body: new Blob([bytes]),
    }).formData();
  } catch {
    throw new HttpError(400, "Invalid multipart upload");
  }
}
