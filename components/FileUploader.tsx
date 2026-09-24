"use client";
import { useRef, useState } from "react";
import type { FileRef } from "@/lib/types";
import { ALLOWED_EXTENSIONS } from "@/lib/sectors";
import { useI18n } from "./LanguageProvider";

type Pending = { name: string; progress: number; error?: string };

const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

type Msg = ReturnType<typeof useI18n>["t"];

function putWithProgress(url: string, file: File, headers: Record<string, string>, onProgress: (p: number) => void, t: Msg) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(t("up.failed", { status: xhr.status }))));
    xhr.onerror = () => reject(new Error(t("up.network")));
    xhr.send(file);
  });
}

export default function FileUploader(props: {
  submissionId: string;
  startedAt: string;
  sectorId: string;
  itemId: string;
  files: FileRef[];
  onChange: (files: FileRef[]) => void;
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [drag, setDrag] = useState(false);

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    const added: FileRef[] = [];
    for (const file of Array.from(list)) {
      setPending((p) => [...p, { name: file.name, progress: 0 }]);
      const update = (patch: Partial<Pending>) => setPending((p) => p.map((x) => (x.name === file.name ? { ...x, ...patch } : x)));
      // Same extension check the server does, but with a message in the user's language.
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_EXTENSIONS.includes(ext)) { update({ error: t("up.badType", { ext }) }); continue; }
      try {
        const res = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissionId: props.submissionId, startedAt: props.startedAt, sectorId: props.sectorId, itemId: props.itemId,
            fileName: file.name, size: file.size, contentType: file.type || "application/octet-stream",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? t("up.refused"));
        await putWithProgress(data.url, file, data.headers, (progress) => update({ progress }), t);
        added.push({ key: data.key, name: file.name, size: file.size, type: file.type, uploadedAt: new Date().toISOString() });
        setPending((p) => p.filter((x) => x.name !== file.name));
      } catch (e) {
        update({ error: (e as Error).message });
      }
    }
    if (added.length) props.onChange([...props.files, ...added]);
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
        onClick={() => input.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-4 text-center text-sm transition ${drag ? "border-teal bg-teal-50" : "border-line bg-ice/60 hover:border-teal"}`}
      >
        <span className="font-medium text-navy">{t("up.title")}</span>
        <span className="mt-0.5 text-xs text-muted">{t("up.hint")}</span>
        <input ref={input} type="file" multiple hidden accept={ALLOWED_EXTENSIONS.map((e) => "." + e).join(",")} onChange={(e) => upload(e.target.files)} />
      </div>

      {(props.files.length > 0 || pending.length > 0) && (
        <ul className="mt-2 space-y-1.5">
          {props.files.map((f) => (
            <li key={f.key} className="flex items-center justify-between gap-2 rounded-md bg-teal-50 px-3 py-1.5 text-xs">
              <span className="truncate"><span className="text-teal">✔</span> {f.name} <span className="text-muted">· {fmtSize(f.size)}</span></span>
              <button type="button" className="text-muted hover:text-red-600" onClick={() => props.onChange(props.files.filter((x) => x.key !== f.key))} aria-label={t("up.remove", { name: f.name })}>✕</button>
            </li>
          ))}
          {pending.map((p) => (
            <li key={p.name} className="rounded-md border border-line px-3 py-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="truncate">{p.name}</span>
                {p.error ? (
                  <button type="button" className="text-red-600" onClick={() => setPending((x) => x.filter((y) => y.name !== p.name))}>{p.error} ✕</button>
                ) : (
                  <span className="text-muted">{p.progress}%</span>
                )}
              </div>
              {!p.error && <div className="mt-1 h-1 rounded bg-line"><div className="h-1 rounded bg-teal transition-all" style={{ width: `${p.progress}%` }} /></div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
