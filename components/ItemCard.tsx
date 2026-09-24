"use client";
import type { DataItem } from "@/lib/sectors";
import { LEVELS, FREQUENCIES, FORMATS } from "@/lib/sectors";
import type { ItemResponse } from "@/lib/types";
import FileUploader from "./FileUploader";
import CountryPicker from "./CountryPicker";
import { useI18n } from "./LanguageProvider";

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
  const { t, item: itemText, option } = useI18n();
  const text = itemText(item);
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
          <span className="block text-sm font-semibold text-ink">{text.label}</span>
          {text.hint && <span className="block text-xs text-muted">{text.hint}</span>}
        </span>
        {on ? (
          <span className="flex items-center gap-2 text-xs">
            {v!.files.length > 0 && <span className="rounded-full bg-amber/20 px-2 py-0.5 font-medium text-amber-800">📎 {v!.files.length}</span>}
            <span className="rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal">{t("item.details", { n: detailCount })}</span>
          </span>
        ) : (
          <span className="text-xs text-muted">{t("item.have")}</span>
        )}
      </button>

      <div className={`grid transition-all duration-300 ease-out ${on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          {v && (
            <div className="grid gap-4 border-t border-line px-4 pb-4 pt-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="label">{t("item.level")}</span>
                <div className="flex flex-wrap gap-1.5">
                  {LEVELS.map((l) => (
                    <button type="button" key={l} className="chip" data-on={v.levels.includes(l)} onClick={() => set({ levels: toggle(v.levels, l) })}>{option(l)}</button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="label">{t("item.coverage")}</span>
                <label className="mb-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-teal" checked={v.globalCoverage} onChange={(e) => set({ globalCoverage: e.target.checked })} />
                  {t("item.global")}
                </label>
                {!v.globalCoverage && <CountryPicker value={v.countries} onChange={(countries) => set({ countries })} placeholder={t("item.countriesPh")} />}
              </div>

              <div>
                <label className="label">{t("item.area")} <span className="font-normal text-muted">{t("item.optional")}</span></label>
                <input className="field" placeholder={t("item.areaPh")} value={v.area} onChange={(e) => set({ area: e.target.value })} />
              </div>
              <div>
                <label className="label">{t("item.resolution")} <span className="font-normal text-muted">{t("item.optional")}</span></label>
                <input className="field" placeholder={t("item.resolutionPh")} value={v.resolution} onChange={(e) => set({ resolution: e.target.value })} />
              </div>

              <div>
                <span className="label">{t("item.frequency")}</span>
                <select className="field" value={v.frequency} onChange={(e) => set({ frequency: e.target.value })}>
                  <option value="">{t("select")}</option>
                  {FREQUENCIES.map((f) => <option key={f} value={f}>{option(f)}</option>)}
                </select>
              </div>
              <div>
                <span className="label">{t("item.years")}</span>
                <div className="flex items-center gap-2">
                  <input className="field" inputMode="numeric" maxLength={4} placeholder={t("item.from")} value={v.yearFrom} onChange={(e) => set({ yearFrom: e.target.value.replace(/\D/g, "") })} />
                  <span className="text-muted">–</span>
                  <input className="field" inputMode="numeric" maxLength={7} placeholder={t("item.to")} value={v.yearTo} onChange={(e) => set({ yearTo: e.target.value })} />
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="label">{t("other.format")}</span>
                <div className="flex flex-wrap gap-1.5">
                  {FORMATS.map((f) => (
                    <button type="button" key={f} className="chip" data-on={v.formats.includes(f)} onClick={() => set({ formats: toggle(v.formats, f) })}>{option(f)}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">{t("item.link")} <span className="font-normal text-muted">{t("item.linkHint")}</span></label>
                <input className="field" type="url" placeholder="https://" value={v.link} onChange={(e) => set({ link: e.target.value })} />
              </div>
              <div>
                <label className="label">{t("item.notes")}</label>
                <input className="field" placeholder={t("item.notesPh")} value={v.notes} onChange={(e) => set({ notes: e.target.value })} />
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
