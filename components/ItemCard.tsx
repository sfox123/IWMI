"use client";
import type { DataItem } from "@/lib/sectors";
import { LEVELS, FREQUENCIES, FORMATS } from "@/lib/sectors";
import type { ItemResponse } from "@/lib/types";
import FileUploader from "./FileUploader";
import CountryPicker from "./CountryPicker";

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function ItemCard(props: {
  item: DataItem;
  sectorId: string;
  value?: ItemResponse;
  submissionId: string;
  startedAt: string;
  defaultCountry?: string;
  onChange: (v: ItemResponse | undefined) => void;
}) {
  const { item, value: v } = props;
  const on = !!v;
  const set = (patch: Partial<ItemResponse>) => v && props.onChange({ ...v, ...patch });

  const start = () =>
    props.onChange({
      itemId: item.id, sectorId: props.sectorId, levels: [], frequency: "", yearFrom: "", yearTo: "", formats: [],
      globalCoverage: false, countries: props.defaultCountry ? [props.defaultCountry] : [], area: "", resolution: "", link: "", notes: "", files: [],
    });

  const detailCount = v ? [v.levels.length, v.frequency, v.yearFrom, v.formats.length, v.globalCoverage || v.countries.length].filter(Boolean).length : 0;

  return (
    <div className={`rounded-xl border transition-all duration-300 ${on ? "border-teal bg-white shadow-md ring-1 ring-teal/30" : "border-line bg-white hover:border-teal/60 hover:shadow-sm"}`}>
      <button type="button" onClick={() => (on ? props.onChange(undefined) : start())} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={on}>
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 text-xs font-bold transition ${on ? "border-teal bg-teal text-white" : "border-line text-transparent"}`}>✓</span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{item.label}</span>
          {item.hint && <span className="block text-xs text-muted">{item.hint}</span>}
        </span>
        {on ? (
          <span className="flex items-center gap-2 text-xs">
            {v!.files.length > 0 && <span className="rounded-full bg-amber/20 px-2 py-0.5 font-medium text-amber-800">📎 {v!.files.length}</span>}
            <span className="rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal">{detailCount}/5 details</span>
          </span>
        ) : (
          <span className="text-xs text-muted">We have this</span>
        )}
      </button>

      <div className={`grid transition-all duration-300 ease-out ${on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          {v && (
            <div className="grid gap-4 border-t border-line px-4 pb-4 pt-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="label">Spatial level</span>
                <div className="flex flex-wrap gap-1.5">
                  {LEVELS.map((l) => (
                    <button type="button" key={l} className="chip" data-on={v.levels.includes(l)} onClick={() => set({ levels: toggle(v.levels, l) })}>{l}</button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="label">Geographic coverage</span>
                <label className="mb-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-teal" checked={v.globalCoverage} onChange={(e) => set({ globalCoverage: e.target.checked })} />
                  Global coverage
                </label>
                {!v.globalCoverage && <CountryPicker value={v.countries} onChange={(countries) => set({ countries })} placeholder="Countries covered…" />}
              </div>

              <div>
                <label className="label">Specific area <span className="font-normal text-muted">(optional)</span></label>
                <input className="field" placeholder="e.g. river basin, province, region" value={v.area} onChange={(e) => set({ area: e.target.value })} />
              </div>
              <div>
                <label className="label">Spatial resolution <span className="font-normal text-muted">(optional)</span></label>
                <input className="field" placeholder="e.g. 1 km, 0.25°, 120 stations" value={v.resolution} onChange={(e) => set({ resolution: e.target.value })} />
              </div>

              <div>
                <span className="label">How often is it recorded?</span>
                <select className="field" value={v.frequency} onChange={(e) => set({ frequency: e.target.value })}>
                  <option value="">Select…</option>
                  {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <span className="label">Years available</span>
                <div className="flex items-center gap-2">
                  <input className="field" inputMode="numeric" maxLength={4} placeholder="From" value={v.yearFrom} onChange={(e) => set({ yearFrom: e.target.value.replace(/\D/g, "") })} />
                  <span className="text-muted">–</span>
                  <input className="field" inputMode="numeric" maxLength={7} placeholder="To / ongoing" value={v.yearTo} onChange={(e) => set({ yearTo: e.target.value })} />
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="label">Format</span>
                <div className="flex flex-wrap gap-1.5">
                  {FORMATS.map((f) => (
                    <button type="button" key={f} className="chip" data-on={v.formats.includes(f)} onClick={() => set({ formats: toggle(v.formats, f) })}>{f}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Link <span className="font-normal text-muted">(if published online)</span></label>
                <input className="field" type="url" placeholder="https://" value={v.link} onChange={(e) => set({ link: e.target.value })} />
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="field" placeholder="Units, gaps, conditions…" value={v.notes} onChange={(e) => set({ notes: e.target.value })} />
              </div>

              <div className="sm:col-span-2">
                <FileUploader submissionId={props.submissionId} startedAt={props.startedAt} sectorId={props.sectorId} itemId={item.id} files={v.files} onChange={(files) => set({ files })} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
