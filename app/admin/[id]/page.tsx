import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubmission } from "@/lib/storage/db";
import { findItem, sectorById } from "@/lib/sectors";
import { countryName } from "@/lib/countries";
import type { FileRef } from "@/lib/types";
import StatusEditor from "@/components/StatusEditor";

export const dynamic = "force-dynamic";

const Files = ({ files }: { files: FileRef[] }) =>
  files.length ? (
    <ul className="mt-2 flex flex-wrap gap-2">
      {files.map((f) => (
        <li key={f.key}>
          <a href={`/api/files?key=${encodeURIComponent(f.key)}&name=${encodeURIComponent(f.name)}`} className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2.5 py-1 text-xs text-teal hover:underline" title={f.key}>
            ⬇ {f.name} <span className="text-muted">({(f.size / 1e6).toFixed(2)} MB)</span>
          </a>
        </li>
      ))}
    </ul>
  ) : null;

export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSubmission(id);
  if (!s) notFound();

  return (
    <div className="space-y-5">
      <Link href="/admin" className="text-sm text-teal hover:underline">← All submissions</Link>
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="card">
          <h1 className="text-2xl font-bold text-navy">{s.contact.affiliation}</h1>
          <p className="text-sm text-muted">Submitted {new Date(s.submittedAt).toLocaleString()} · Ref {s.id.slice(0, 8).toUpperCase()}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            {[["Name", s.contact.name], ["Designation", s.contact.designation], ["Country", s.contact.country ? countryName(s.contact.country) : ""], ["Email", s.contact.email], ["Contact", s.contact.phone], ["Access", s.sharing.access], ["Approver", s.sharing.approver], ["Portal", s.sharing.portal]].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="break-words font-medium">{v || "—"}</dd></div>
            ))}
          </dl>
        </div>
        <StatusEditor id={s.id} status={s.status} notes={s.adminNotes ?? ""} />
      </div>

      {s.sectors.map((sid) => {
        const sec = sectorById(sid);
        const items = s.items.filter((i) => i.sectorId === sid);
        return (
          <div key={sid} className="card">
            <h2 className="text-lg font-bold text-navy">{sec?.icon} {sec?.label ?? sid} <span className="text-sm font-normal text-muted">· {items.length} datasets</span></h2>
            {items.length === 0 && <p className="mt-2 text-sm text-muted">No datasets ticked.</p>}
            <div className="mt-3 divide-y divide-line">
              {items.map((i) => {
                const f = findItem(i.itemId);
                return (
                  <div key={i.itemId} className="py-3">
                    <div className="font-semibold">{f?.item.label ?? i.itemId}{f?.sector.hasSubsectors && <span className="ml-2 rounded bg-ice px-1.5 text-xs font-normal text-muted">{f.group.label}</span>}</div>
                    <div className="mt-1 grid gap-x-6 gap-y-1 text-xs text-muted sm:grid-cols-3">
                      <span><b className="text-ink">Level:</b> {i.levels.join(", ") || "—"}</span>
                      <span><b className="text-ink">Frequency:</b> {i.frequency || "—"}</span>
                      <span><b className="text-ink">Years:</b> {i.yearFrom ? `${i.yearFrom}–${i.yearTo || "…"}` : "—"}</span>
                      <span><b className="text-ink">Coverage:</b> {i.globalCoverage ? "Global" : i.countries.map(countryName).join(", ") || "—"}</span>
                      <span><b className="text-ink">Area:</b> {i.area || "—"}</span>
                      <span><b className="text-ink">Resolution:</b> {i.resolution || "—"}</span>
                      <span className="sm:col-span-3"><b className="text-ink">Format:</b> {i.formats.join(", ") || "—"}</span>
                      {i.link && <span className="sm:col-span-3"><b className="text-ink">Link:</b> <a className="text-teal underline" href={i.link} target="_blank" rel="noreferrer">{i.link}</a></span>}
                      {i.notes && <span className="sm:col-span-3"><b className="text-ink">Notes:</b> {i.notes}</span>}
                    </div>
                    <Files files={i.files} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {s.others.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold text-navy">Other datasets</h2>
          <div className="mt-2 divide-y divide-line">
            {s.others.map((o, idx) => (
              <div key={idx} className="py-3 text-sm">
                <div className="font-semibold">{o.name}</div>
                <div className="text-xs text-muted">{[sectorById(o.sectorId)?.label, o.description, o.coverage, o.years, o.format].filter(Boolean).join(" · ")}</div>
                <Files files={o.files} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card grid gap-4 sm:grid-cols-3">
        {[["Done so far", s.progress.done], ["Next 3 months", s.progress.next3Months], ["Support needed", s.progress.support]].map(([k, v]) => (
          <div key={k}><div className="text-xs font-semibold uppercase text-teal">{k}</div><p className="mt-1 whitespace-pre-wrap text-sm">{v || "—"}</p></div>
        ))}
      </div>
    </div>
  );
}
