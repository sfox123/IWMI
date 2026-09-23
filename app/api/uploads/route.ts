import { NextResponse } from "next/server";
import { z } from "zod";
import { buildFileKey, checkFile, getUploadTarget } from "@/lib/storage/files";

const Body = z.object({
  submissionId: z.string().uuid(),
  startedAt: z.string().optional(),
  sectorId: z.string().min(1).max(60),
  itemId: z.string().min(1).max(60),
  fileName: z.string().min(1).max(255),
  size: z.number().positive(),
  contentType: z.string().max(200).optional(),
});

// Step 1 of an upload: the browser asks where to put the file.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const b = parsed.data;
  const problem = checkFile(b.fileName, b.size);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const key = buildFileKey(b);
  const contentType = b.contentType || "application/octet-stream";
  const target = await getUploadTarget(key, contentType);
  return NextResponse.json({ key, ...target });
}
