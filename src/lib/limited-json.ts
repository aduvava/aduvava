// Read request bodies in bounded chunks. Relying only on Content-Length
// is unsafe because clients can omit or misreport that header.
export class RequestBodyTooLargeError extends Error {
  readonly status = 413;
  constructor() {
    super("Request body too large");
    this.name = "RequestBodyTooLargeError";
  }
}

export class InvalidJsonBodyError extends Error {
  readonly status = 400;
  constructor() {
    super("Invalid JSON payload");
    this.name = "InvalidJsonBodyError";
  }
}

export async function readLimitedJson(request: Request, maxBytes: number): Promise<unknown> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error("Invalid body size limit");
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > maxBytes) {
    throw new RequestBodyTooLargeError();
  }
  if (!request.body) throw new InvalidJsonBodyError();

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

  try {
    return JSON.parse(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), size).toString("utf8"));
  } catch {
    throw new InvalidJsonBodyError();
  }
}
