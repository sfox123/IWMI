import Link from "next/link";
import { listSubmissions } from "@/lib/storage/db";
import { SECTORS, sectorById } from "@/lib/sectors";
import { countryName } from "@/lib/countries";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  new: "bg-amber/20 text-amber-800",
  reviewed: "bg-sky-100 text-sky-800",
  "follow-up": "bg-rose-100 text-rose-800",
  complete: "bg-teal-50 text-teal",
};

export default async function Admin({ searchParams }: { searchParams: Promise<{ sector?: string; status?: string; q?: string }> }) {
  const sp = await searchParams;
  const all = await listSubmissions();
  const q = (sp.q ?? "").toLowerCase();
  const subs = all.filter((s) =>
    (!sp.sector || s.sectors.includes(sp.sector)) &&
    (!sp.status || s.status === sp.status) &&
    (!q || [s.contact.name, s.contact.affiliation, s.contact.email].some((v) => v.toLowerCase().includes(q))),
  );
  const datasets = all.reduce((n, s) => n + s.items.length + s.others.length, 0);
  const files = all.reduce((n, s) => n + s.items.reduce((m, i) => m + i.files.length, 0) + s.others.reduce((m, o) => m + o.files.length, 0), 0);
  const bySector = SECTORS.map((sec) => ({ sec, n: all.reduce((n, s) => n + s.items.filter((i) => i.sectorId === sec.id).length, 0) }));
  const max = Math.max(1, ...bySector.map((b) => b.n));

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin${p.size ? "?" + p : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Submissions</h1>
          <p className="text-sm text-muted">Everything organisations have shared through the form.</p>
        </div>
        <a href="/api/admin/export" className="btn-primary">⬇ Export data inventory (CSV)</a>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[["Responses", all.length], ["Datasets listed", datasets], ["Files uploaded", files], ["Awaiting review", all.filter((s) => s.status === "new").length]].map(([l, v]) => (
          <div key={l} className="card !p-4"><div className="text-3xl font-bold text-navy">{v}</div><div className="text-xs text-muted">{l}</div></div>
        ))}
      </div>

      <div className="card">
        <div className="mb-3 text-sm font-semibold text-navy">Datasets by sector <span className="font-normal text-muted">· click to filter</span></div>
        <div className="space-y-2">
          {bySector.map(({ sec, n }) => (
            <Link key={sec.id} href={qs({ sector: sp.sector === sec.id ? undefined : sec.id })} className={`grid grid-cols-[170px_1fr_32px] items-center gap-3 rounded-md px-1 text-sm hover:bg-ice ${sp.sector === sec.id ? "bg-ice font-semibold" : ""}`}>
              <span className="truncate">{sec.icon} {sec.label}</span>
              <span className="h-2.5 rounded-full bg-line"><span className="block h-2.5 rounded-full bg-teal" style={{ width: `${(n / max) * 100}%` }} /></span>
              <span className="text-right tabular-nums text-muted">{n}</span>
            </Link>
          ))}
        </div>
      </div>

      <form className="flex flex-wrap gap-2" action="/admin">
        {sp.sector && <input type="hidden" name="sector" value={sp.sector} />}
        <input name="q" defaultValue={sp.q} placeholder="Search name, organisation, email…" className="field max-w-xs" />
        <select name="status" defaultValue={sp.status ?? ""} className="field max-w-40">
          <option value="">All statuses</option>
          {["new", "reviewed", "follow-up", "complete"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="btn-ghost">Filter</button>
        {(sp.q || sp.status || sp.sector) && <Link href="/admin" className="btn-ghost">Clear</Link>}
      </form>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full text-sm">
          <thead className="bg-ice text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Organisation</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Sectors</th><th className="px-4 py-3 text-right">Datasets</th><th className="px-4 py-3 text-right">Files</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {subs.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">No submissions yet.</td></tr>}
            {subs.map((s) => (
              <tr key={s.id} className="hover:bg-ice/60">
                <td className="whitespace-nowrap px-4 py-3 text-muted">{new Date(s.submittedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3"><Link href={`/admin/${s.id}`} className="font-semibold text-navy hover:underline">{s.contact.affiliation}</Link>{s.contact.country && <div className="text-xs text-muted">{countryName(s.contact.country)}</div>}</td>
                <td className="px-4 py-3">{s.contact.name}<div className="text-xs text-muted">{s.contact.email}</div></td>
                <td className="px-4 py-3 text-lg" title={s.sectors.map((x) => sectorById(x)?.label).join(", ")}>{s.sectors.map((x) => sectorById(x)?.icon).join(" ")}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.items.length + s.others.length}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.items.reduce((m, i) => m + i.files.length, 0) + s.others.reduce((m, o) => m + o.files.length, 0)}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status]}`}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
