import { NextResponse } from "next/server";
import { z } from "zod";
import { updateSubmissionMeta, getSubmission, deleteSubmission } from "@/lib/storage/db";
import { deleteFolder } from "@/lib/storage/files";

const Body = z.object({
  status: z.enum(["new", "reviewed", "follow-up", "complete"]).optional(),
  adminNotes: z.string().max(5000).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const updated = await updateSubmissionMeta(id, parsed.data);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

/** Deletes the record and every stored file for the submission (uploads + submission.json). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sub = await getSubmission(id);
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const keys = [...sub.items.flatMap((i) => i.files), ...sub.others.flatMap((o) => o.files)].map((f) => f.key);
  const folders = new Set(keys.filter((k) => k.includes(`/${id}/`)).map((k) => `${k.split(`/${id}/`)[0]}/${id}`));
  for (const folder of folders) await deleteFolder(folder);
  await deleteSubmission(id);
  return NextResponse.json({ ok: true });
}
