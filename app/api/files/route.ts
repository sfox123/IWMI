import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { MODE, getDownloadUrl, openLocal } from "@/lib/storage/files";

// Admin-only (see middleware.ts): download an uploaded file.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const key = u.searchParams.get("key") ?? "";
  const name = (u.searchParams.get("name") ?? "download").replace(/[^a-zA-Z0-9._-]/g, "_");
  try {
    if (MODE === "aws") {
      const url = await getDownloadUrl(key, name);
      return NextResponse.redirect(url!);
    }
    const { stream, size } = await openLocal(key);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: { "Content-Disposition": `attachment; filename="${name}"`, "Content-Length": String(size), "Content-Type": "application/octet-stream" },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
