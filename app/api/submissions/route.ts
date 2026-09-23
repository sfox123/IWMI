import { NextResponse } from "next/server";
import { SubmissionSchema, type Submission } from "@/lib/types";
import { saveSubmission, getSubmission } from "@/lib/storage/db";
import { putJson } from "@/lib/storage/files";

export async function POST(req: Request) {
  const parsed = SubmissionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  }
  const input = parsed.data;

  // Every attached file must belong to this submission's folder.
  const allFiles = [...input.items.flatMap((i) => i.files), ...input.others.flatMap((o) => o.files)];
  if (allFiles.some((f) => !f.key.includes(`/${input.id}/`))) {
    return NextResponse.json({ error: "File does not belong to this submission" }, { status: 400 });
  }
  if (await getSubmission(input.id)) {
    return NextResponse.json({ error: "This form has already been submitted" }, { status: 409 });
  }

  const submission: Submission = { ...input, submittedAt: new Date().toISOString(), status: "new" };
  await saveSubmission(submission);

  // Keep a self-describing copy next to the uploaded files.
  const folder = allFiles[0]?.key.split(`/${input.id}/`)[0];
  if (folder) await putJson(`${folder}/${input.id}/submission.json`, submission);

  return NextResponse.json({ ok: true, id: submission.id });
}
