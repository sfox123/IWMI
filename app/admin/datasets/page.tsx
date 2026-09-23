import Link from "next/link";
import { listSubmissions } from "@/lib/storage/db";
import { SECTORS, findItem, sectorById } from "@/lib/sectors";
import { countryName } from "@/lib/countries";

export const dynamic = "force-dynamic";

type Row = {
  subId: string; org: string; sectorId: string; sub?: string; label: string; freq: string; years: string;
  coverage: string; formats: string; files: { key: string; name: string }[]; other: boolean;
};

export default async function Datasets({ searchParams }: { searchParams: Promise<{ sector?: string; q?: string; files?: string }> }) {
  const sp = await searchParams;
  const subs = await listSubmissions();
  let rows: Row[] = subs.flatMap((s) => [
    ...s.items.map((i) => {
      const f = findItem(i.itemId);
      return {
        subId: s.id, org: s.contact.affiliation, sectorId: i.sectorId, sub: f?.sector.hasSubsectors ? f.group.label : undefined,
        label: f?.item.label ?? i.itemId, freq: i.frequency, years: i.yearFrom ? `${i.yearFrom}–${i.yearTo || "…"}` : "",
        coverage: i.globalCoverage ? "Global" : i.countries.map(countryName).join(", "), formats: i.formats.join(", "), files: i.files, other: false,
      };
    }),
    ...s.others.map((o) => ({
      subId: s.id, org: s.contact.affiliation, sectorId: o.sectorId || "other", label: o.name, freq: "", years: o.years,
      coverage: o.coverage, formats: o.format, files: o.files, other: true,
    })),
  ]);
  const q = (sp.q ?? "").toLowerCase();
  rows = rows.filter((r) => (!sp.sector || r.sectorId === sp.sector) && (!sp.files || r.files.length > 0) && (!q || `${r.label} ${r.org} ${r.coverage}`.toLowerCase().includes(q)));

  // Which catalogue items have the most holders — useful to spot coverage gaps
  const counts = new Map<string, number>();
  subs.forEach((s) => s.items.forEach((i) => counts.set(i.itemId, (counts.get(i.itemId) ?? 0) + 1)));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy">Datasets</h1>
        <p className="text-sm text-muted">Every dataset listed across all responses. {rows.length} shown.</p>
      </div>

      <form className="flex flex-wrap gap-2" action="/admin/datasets">
        <select name="sector" defaultValue={sp.sector ?? ""} className="field max-w-56">
          <option value="">All sectors</option>
          {SECTORS.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
        </select>
        <input name="q" defaultValue={sp.q} placeholder="Search dataset, organisation, country…" className="field max-w-xs" />
        <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm"><input type="checkbox" name="files" value="1" defaultChecked={!!sp.files} className="accent-teal" /> With files only</label>
        <button className="btn-ghost">Filter</button>
        {(sp.q || sp.sector || sp.files) && <Link href="/admin/datasets" className="btn-ghost">Clear</Link>}
      </form>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full text-sm">
          <thead className="bg-ice text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-3">Dataset</th><th className="px-4 py-3">Held by</th><th className="px-4 py-3">Coverage</th><th className="px-4 py-3">Frequency</th><th className="px-4 py-3">Years</th><th className="px-4 py-3">Format</th><th className="px-4 py-3">Files</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">No datasets match.</td></tr>}
            {rows.map((r, idx) => (
              <tr key={idx} className="align-top hover:bg-ice/60">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.label}{r.other && <span className="ml-1.5 rounded bg-amber/20 px-1.5 text-[10px] text-amber-800">other</span>}</div>
                  <div className="text-xs text-muted">{sectorById(r.sectorId)?.icon} {sectorById(r.sectorId)?.label ?? "Other"}{r.sub ? ` · ${r.sub}` : ""}</div>
                </td>
                <td className="px-4 py-3"><Link href={`/admin/${r.subId}`} className="text-navy hover:underline">{r.org}</Link></td>
                <td className="px-4 py-3 text-xs">{r.coverage || "—"}</td>
                <td className="px-4 py-3 text-xs">{r.freq || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">{r.years || "—"}</td>
                <td className="px-4 py-3 text-xs">{r.formats || "—"}</td>
                <td className="px-4 py-3 text-xs">
                  {r.files.length === 0 ? "—" : r.files.map((f) => (
                    <a key={f.key} className="block text-teal hover:underline" href={`/api/files?key=${encodeURIComponent(f.key)}&name=${encodeURIComponent(f.name)}`}>⬇ {f.name}</a>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="mb-3 text-sm font-semibold text-navy">Coverage by data type <span className="font-normal text-muted">· how many organisations hold each dataset</span></div>
        <div className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
          {SECTORS.filter((s) => !sp.sector || s.id === sp.sector).flatMap((s) => s.groups.flatMap((g) => g.items.map((i) => ({ s, i })))).map(({ s, i }) => {
            const n = counts.get(i.id) ?? 0;
            return (
              <div key={s.id + i.id} className="flex items-center justify-between border-b border-line/60 py-1">
                <span className={n ? "" : "text-muted"}>{s.icon} {i.label}</span>
                <span className={`rounded-full px-2 tabular-nums ${n ? "bg-teal-50 font-semibold text-teal" : "text-rose-400"}`}>{n || "gap"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
