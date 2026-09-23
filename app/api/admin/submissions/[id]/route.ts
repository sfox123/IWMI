import { NextResponse } from "next/server";
import { z } from "zod";
import { updateSubmissionMeta } from "@/lib/storage/db";

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
