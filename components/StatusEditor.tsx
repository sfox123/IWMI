"use client";
import { useState } from "react";

const STATUSES = ["new", "reviewed", "follow-up", "complete"] as const;

export default function StatusEditor(props: { id: string; status: string; notes: string }) {
  const [status, setStatus] = useState(props.status);
  const [notes, setNotes] = useState(props.notes);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(next = status) {
    setState("saving");
    const res = await fetch(`/api/admin/submissions/${props.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next, adminNotes: notes }) });
    setState(res.ok ? "saved" : "error");
  }

  return (
    <div className="card">
      <div className="text-sm font-semibold text-navy">Follow-up</div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {STATUSES.map((s) => (
          <button key={s} type="button" className="chip justify-center" data-on={status === s} onClick={() => { setStatus(s); save(s); }}>{s}</button>
        ))}
      </div>
      <label className="label mt-4">Internal notes</label>
      <textarea className="field min-h-24" value={notes} onChange={(e) => { setNotes(e.target.value); setState("idle"); }} placeholder="Calls made, MoU status…" />
      <button className="btn-primary mt-2 w-full" onClick={() => save()} disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Save notes"}</button>
      {state === "saved" && <p className="mt-2 text-xs text-teal">Saved ✓</p>}
      {state === "error" && <p className="mt-2 text-xs text-red-600">Could not save</p>}
    </div>
  );
}
