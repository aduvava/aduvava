import { imageMime, readStoreAsset } from "@/lib/store-upload-storage";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const type = imageMime(name);
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const file = await readStoreAsset(name, 5 * 1024 * 1024);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(file.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
