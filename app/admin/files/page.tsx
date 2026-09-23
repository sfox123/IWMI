import Link from "next/link";
import { listSubmissions } from "@/lib/storage/db";
import { findItem, sectorById } from "@/lib/sectors";
import { MODE } from "@/lib/storage/files";

export const dynamic = "force-dynamic";

const size = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(2)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

export default async function Files({ searchParams }: { searchParams: Promise<{ q?: string; ext?: string }> }) {
  const sp = await searchParams;
  const subs = await listSubmissions();
  const all = subs.flatMap((s) => [
    ...s.items.flatMap((i) => i.files.map((f) => ({ f, s, dataset: findItem(i.itemId)?.item.label ?? i.itemId, sectorId: i.sectorId }))),
    ...s.others.flatMap((o) => o.files.map((f) => ({ f, s, dataset: o.name, sectorId: o.sectorId }))),
  ]).sort((a, b) => b.f.uploadedAt.localeCompare(a.f.uploadedAt));
  const exts = [...new Set(all.map((x) => x.f.name.split(".").pop()!.toLowerCase()))].sort();
  const q = (sp.q ?? "").toLowerCase();
  const files = all.filter((x) => (!sp.ext || x.f.name.toLowerCase().endsWith("." + sp.ext)) && (!q || `${x.f.name} ${x.dataset} ${x.s.contact.affiliation}`.toLowerCase().includes(q)));
  const total = all.reduce((n, x) => n + x.f.size, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Files</h1>
          <p className="text-sm text-muted">{all.length} files · {size(total)} · stored {MODE === "aws" ? "in S3" : "on this server under data/uploads/"}</p>
        </div>
      </div>

      <form className="flex flex-wrap gap-2" action="/admin/files">
        <input name="q" defaultValue={sp.q} placeholder="Search file, dataset, organisation…" className="field max-w-xs" />
        <select name="ext" defaultValue={sp.ext ?? ""} className="field max-w-36">
          <option value="">All types</option>
          {exts.map((e) => <option key={e} value={e}>.{e}</option>)}
        </select>
        <button className="btn-ghost">Filter</button>
        {(sp.q || sp.ext) && <Link href="/admin/files" className="btn-ghost">Clear</Link>}
      </form>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full text-sm">
          <thead className="bg-ice text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-3">File</th><th className="px-4 py-3">Dataset</th><th className="px-4 py-3">Organisation</th><th className="px-4 py-3 text-right">Size</th><th className="px-4 py-3">Uploaded</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {files.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No files yet.</td></tr>}
            {files.map(({ f, s, dataset, sectorId }) => (
              <tr key={f.key} className="hover:bg-ice/60">
                <td className="px-4 py-3"><div className="font-medium">{f.name}</div><div className="max-w-xs truncate font-mono text-[10px] text-muted" title={f.key}>{f.key}</div></td>
                <td className="px-4 py-3 text-xs">{sectorById(sectorId)?.icon} {dataset}</td>
                <td className="px-4 py-3"><Link href={`/admin/${s.id}`} className="text-navy hover:underline">{s.contact.affiliation}</Link></td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-xs">{size(f.size)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{new Date(f.uploadedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3"><a className="btn-ghost !px-3 !py-1 text-xs" href={`/api/files?key=${encodeURIComponent(f.key)}&name=${encodeURIComponent(f.name)}`}>⬇ Download</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
