import { NextResponse } from "next/server";
import { MODE, MAX_BYTES, writeLocal, assertKey } from "@/lib/storage/files";

// Step 2 (local mode only): receive the file bytes. In AWS mode the browser PUTs straight to S3.
export async function PUT(req: Request) {
  if (MODE !== "local") return NextResponse.json({ error: "Not available" }, { status: 404 });
  const key = new URL(req.url).searchParams.get("key") ?? "";
  try {
    assertKey(key);
  } catch {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }
  const buf = await req.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return NextResponse.json({ error: "File too large" }, { status: 413 });
  await writeLocal(key, buf);
  return NextResponse.json({ ok: true });
}
