import { listSubmissions } from "@/lib/storage/db";
import { findItem, sectorById } from "@/lib/sectors";
import { countryName } from "@/lib/countries";

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// One row per dataset → a ready-made data inventory in Excel.
export async function GET() {
  const subs = await listSubmissions();
  const header = ["Submitted", "Status", "Name", "Designation", "Affiliation", "Country", "Email", "Phone", "Sector", "Sub-sector", "Dataset", "Levels", "Frequency", "From", "To", "Formats", "Coverage", "Area", "Resolution", "Link", "Files", "Notes", "Access", "Submission ID"];
  const rows: string[][] = [];
  for (const s of subs) {
    const base = [s.submittedAt, s.status, s.contact.name, s.contact.designation, s.contact.affiliation, s.contact.country ? countryName(s.contact.country) : "", s.contact.email, s.contact.phone];
    for (const i of s.items) {
      const f = findItem(i.itemId);
      rows.push([...base, f?.sector.label ?? i.sectorId, f?.sector.hasSubsectors ? f.group.label : "", f?.item.label ?? i.itemId, i.levels.join("; "), i.frequency, i.yearFrom, i.yearTo, i.formats.join("; "),
        i.globalCoverage ? "Global" : i.countries.map(countryName).join("; "), i.area, i.resolution, i.link, String(i.files.length), i.notes, s.sharing.access, s.id]);
    }
    for (const o of s.others) {
      rows.push([...base, sectorById(o.sectorId)?.label ?? "Other", "", o.name + (o.description ? ` — ${o.description}` : ""), "", "", o.years, "", o.format, o.coverage, "", "", "", String(o.files.length), "", s.sharing.access, s.id]);
    }
  }
  const csv = "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="data-inventory-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
