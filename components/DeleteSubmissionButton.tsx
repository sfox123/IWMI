"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteSubmissionButton(props: { id: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Delete the submission from "${props.label}" and all its uploaded files? This cannot be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/submissions/${props.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert("Could not delete the submission.");
  }

  return (
    <button type="button" onClick={remove} disabled={busy} className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
