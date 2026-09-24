"use client";
import { useEffect, useMemo, useState } from "react";
import { SECTORS, ACCESS, sectorById, type Sector } from "@/lib/sectors";
import type { ItemResponse, OtherDataset, SubmissionInput } from "@/lib/types";
import ItemCard from "./ItemCard";
import FileUploader from "./FileUploader";
import CountrySelect from "./CountrySelect";
import { useI18n } from "./LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";

type OtherRow = OtherDataset & { rowId: string };
type Draft = {
  id: string;
  startedAt: string;
  step: number;
  contact: SubmissionInput["contact"];
  sectors: string[];
  subsectors: Record<string, string[]>;
  items: Record<string, ItemResponse>;
  others: OtherRow[];
  sharing: SubmissionInput["sharing"];
  progress: SubmissionInput["progress"];
};

const STORAGE_KEY = "data-request-draft-v1";

// Required contact fields, checked in this order (the first missing one gets focus).
const REQUIRED = { name: "err.name", affiliation: "err.affiliation", email: "err.email" } as const satisfies Record<string, MessageKey>;
type RequiredField = keyof typeof REQUIRED;
const isValid = (k: RequiredField, v: string) => (k === "email" ? /^\S+@\S+\.\S+$/.test(v.trim()) : !!v.trim());
const STEPS: MessageKey[] = ["step.details", "step.sectors", "step.datasets", "step.sharing", "step.review"];

const newDraft = (): Draft => ({
  id: crypto.randomUUID(),
  startedAt: new Date().toISOString(),
  step: 0,
  contact: { name: "", designation: "", affiliation: "", country: "", email: "", phone: "" },
  sectors: [],
  subsectors: {},
  items: {},
  others: [],
  sharing: { access: "", approver: "", portal: "" },
  progress: { done: "", next3Months: "", support: "" },
});

const visibleGroups = (s: Sector, sub: Record<string, string[]>) =>
  s.hasSubsectors && sub[s.id]?.length ? s.groups.filter((g) => sub[s.id].includes(g.id)) : s.groups;

export default function RequestForm() {
  const { t, sector, group, item: itemText, option, countryName, locale } = useI18n();
  const [d, setD] = useState<Draft | null>(null);
  const [activeSector, setActiveSector] = useState<string>("");
  const [filter, setFilter] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [invalid, setInvalid] = useState<RequiredField[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Load draft (autosave) on mount
  useEffect(() => {
    let draft: Draft | null = null;
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) draft = JSON.parse(raw); } catch {}
    setD(draft ?? newDraft());
  }, []);
  useEffect(() => {
    if (!d) return;
    const t = setTimeout(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); setSavedAt(new Date()); } catch {} }, 400);
    return () => clearTimeout(t);
  }, [d]);
  useEffect(() => {
    if (d && (!activeSector || !d.sectors.includes(activeSector))) setActiveSector(d.sectors[0] ?? "");
  }, [d, activeSector]);

  const stats = useMemo(() => {
    if (!d) return { datasets: 0, files: 0, bySector: {} as Record<string, number> };
    const items = Object.values(d.items).filter((i) => d.sectors.includes(i.sectorId));
    const bySector: Record<string, number> = {};
    items.forEach((i) => (bySector[i.sectorId] = (bySector[i.sectorId] ?? 0) + 1));
    return {
      datasets: items.length + d.others.filter((o) => o.name.trim()).length,
      files: items.reduce((n, i) => n + i.files.length, 0) + d.others.reduce((n, o) => n + o.files.length, 0),
      bySector,
    };
  }, [d]);

  if (!d) return <div className="card animate-pulse text-muted">{t("loading")}</div>;

  const up = (patch: Partial<Draft>) => setD((x) => (x ? { ...x, ...patch } : x));
  const setContact = (k: keyof Draft["contact"], v: string) => {
    up({ contact: { ...d.contact, [k]: v } });
    // Clear the red state as soon as a flagged field becomes valid.
    if (invalid.includes(k as RequiredField) && isValid(k as RequiredField, v)) setInvalid((x) => x.filter((f) => f !== k));
  };
  // Props for a required contact input: red border + message below when it failed validation.
  const req = (k: RequiredField) => ({
    id: `f-${k}`,
    "aria-invalid": invalid.includes(k),
    "aria-describedby": invalid.includes(k) ? `f-${k}-err` : undefined,
  });
  const reqError = (k: RequiredField) => invalid.includes(k) && <p id={`f-${k}-err`} className="mt-1 text-xs text-red-600">{t(REQUIRED[k])}</p>;

  function validate(step: number) {
    const e: string[] = [];
    if (step === 0) {
      const bad = (Object.keys(REQUIRED) as RequiredField[]).filter((k) => !isValid(k, d!.contact[k]));
      setInvalid(bad);
      if (bad.length) {
        const el = document.getElementById(`f-${bad[0]}`);
        el?.focus({ preventScroll: true });
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        return false;
      }
    }
    if (step === 1 && d!.sectors.length === 0) e.push(t("err.sectors"));
    setErrors(e);
    return e.length === 0;
  }
  const go = (step: number) => {
    if (step > d.step && !validate(d.step)) return;
    setErrors([]);
    up({ step });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function submit() {
    setSubmitting(true);
    setErrors([]);
    const payload: SubmissionInput = {
      id: d!.id,
      contact: d!.contact,
      sectors: d!.sectors,
      subsectors: d!.subsectors,
      items: Object.values(d!.items).filter((i) => d!.sectors.includes(i.sectorId)),
      others: d!.others.filter((o) => o.name.trim()).map(({ rowId: _r, ...o }) => o),
      sharing: d!.sharing,
      progress: d!.progress,
    };
    try {
      const res = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("err.submit"));
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      setDone(data.id);
    } catch (e) {
      setErrors([(e as Error).message]);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 animate-[pop_.5s_ease-out] place-items-center rounded-full bg-teal text-3xl text-white">✓</div>
        <h1 className="text-2xl font-bold text-navy">{t("done.title")}</h1>
        <p className="mt-2 text-muted">{t("done.body")}</p>
        <div className="mt-5 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-xl bg-ice p-4"><div className="text-3xl font-bold text-navy">{stats.datasets}</div><div className="text-xs text-muted">{t("done.datasets")}</div></div>
          <div className="rounded-xl bg-ice p-4"><div className="text-3xl font-bold text-navy">{stats.files}</div><div className="text-xs text-muted">{t("done.files")}</div></div>
        </div>
        <p className="mt-5 text-xs text-muted">{t("done.reference")} <code className="rounded bg-ice px-1.5 py-0.5">{done.slice(0, 8).toUpperCase()}</code></p>
        <button className="btn-ghost mt-5" onClick={() => { setDone(null); setD(newDraft()); }}>{t("done.another")}</button>
        <style>{`@keyframes pop{0%{transform:scale(.3);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}`}</style>
      </div>
    );
  }

  const completion = Math.round(((d.step + (d.step === 4 ? 1 : 0)) / STEPS.length) * 100);

  return (
    <div>
      {/* Intro */}
      {d.step === 0 && (
        <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-teal p-6 text-white sm:p-8">
          <h1 className="text-2xl font-bold sm:text-3xl">{t("intro.title")}</h1>
          <p className="mt-2 max-w-2xl text-white/85">{t("intro.body")}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {(["intro.time", "intro.autosave", "intro.optional"] as const).map((k) => <span key={k} className="rounded-full bg-white/15 px-3 py-1">{t(k)}</span>)}
          </div>
        </div>
      )}

      {/* Stepper */}
      <nav className="mb-6">
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-teal transition-all duration-500" style={{ width: `${Math.max(completion, 6)}%` }} /></div>
        <ol className="flex flex-wrap gap-x-5 gap-y-1 text-xs sm:text-sm">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button type="button" disabled={i > d.step} onClick={() => go(i)} className={`flex items-center gap-1.5 ${i === d.step ? "font-semibold text-navy" : i < d.step ? "text-teal hover:underline" : "text-muted"}`}>
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${i < d.step ? "bg-teal text-white" : i === d.step ? "bg-navy text-white" : "bg-line text-muted"}`}>{i < d.step ? "✓" : i + 1}</span>
                {t(s)}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          {errors.length > 0 && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {errors.map((e) => <div key={e}>{e}</div>)}
            </div>
          )}

          {/* STEP 0 — contact */}
          {d.step === 0 && (
            <section className="card">
              <h2 className="text-lg font-bold text-navy">{t("step.details")}</h2>
              <p className="mb-5 text-sm text-muted">{t("details.sub")}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="f-name" className="label">{t("f.name")}</label><input {...req("name")} className="field" value={d.contact.name} onChange={(e) => setContact("name", e.target.value)} autoComplete="name" />{reqError("name")}</div>
                <div><label className="label">{t("f.designation")}</label><input className="field" value={d.contact.designation} onChange={(e) => setContact("designation", e.target.value)} placeholder={t("f.designationPh")} /></div>
                <div className="sm:col-span-2"><label htmlFor="f-affiliation" className="label">{t("f.affiliation")}</label><input {...req("affiliation")} className="field" value={d.contact.affiliation} onChange={(e) => setContact("affiliation", e.target.value)} autoComplete="organization" />{reqError("affiliation")}</div>
                <div><label htmlFor="f-email" className="label">{t("f.email")}</label><input {...req("email")} className="field" type="email" value={d.contact.email} onChange={(e) => setContact("email", e.target.value)} autoComplete="email" />{reqError("email")}</div>
                <div><label className="label">{t("f.phone")}</label><input className="field" type="tel" value={d.contact.phone} onChange={(e) => setContact("phone", e.target.value)} autoComplete="tel" placeholder={t("f.phonePh")} /></div>
                <div className="sm:col-span-2">
                  <label htmlFor="f-country" className="label">{t("f.country")}</label>
                  <CountrySelect id="f-country" value={d.contact.country} onChange={(code) => setContact("country", code)} />
                </div>
              </div>
            </section>
          )}

          {/* STEP 1 — sectors */}
          {d.step === 1 && (
            <section>
              <h2 className="text-lg font-bold text-navy">{t("sectors.title")}</h2>
              <p className="mb-4 text-sm text-muted">{t("sectors.sub")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {SECTORS.map((s) => {
                  const on = d.sectors.includes(s.id);
                  const st = sector(s);
                  return (
                    <div key={s.id} className={`rounded-2xl border-2 bg-white transition-all duration-200 ${on ? "border-teal shadow-md" : "border-line hover:-translate-y-0.5 hover:border-teal/50 hover:shadow"}`}>
                      <button type="button" aria-pressed={on} onClick={() => up({ sectors: on ? d.sectors.filter((x) => x !== s.id) : [...d.sectors, s.id] })} className="flex w-full items-start gap-3 p-4 text-left">
                        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl transition ${on ? "scale-110 bg-teal-50" : "bg-ice"}`}>{s.icon}</span>
                        <span className="flex-1">
                          <span className="block font-semibold text-ink">{st.label}</span>
                          <span className="block text-xs text-muted">{st.description}</span>
                          <span className="mt-1 block text-[11px] text-teal">{t("sectors.dataTypes", { n: s.groups.reduce((n, g) => n + g.items.length, 0) })}</span>
                        </span>
                        <span className={`grid h-6 w-6 place-items-center rounded-full border-2 text-xs transition ${on ? "border-teal bg-teal text-white" : "border-line text-transparent"}`}>✓</span>
                      </button>
                      {s.hasSubsectors && on && (
                        <div className="border-t border-line px-4 pb-4 pt-3">
                          <div className="mb-2 text-xs font-medium text-navy">{t("sectors.subQ")} <span className="font-normal text-muted">{t("sectors.subHint")}</span></div>
                          <div className="flex flex-wrap gap-1.5">
                            {s.groups.map((g) => {
                              const cur = d.subsectors[s.id] ?? [];
                              const gOn = cur.includes(g.id);
                              return <button type="button" key={g.id} className="chip" data-on={gOn} onClick={() => up({ subsectors: { ...d.subsectors, [s.id]: gOn ? cur.filter((x) => x !== g.id) : [...cur, g.id] } })}>{group(g)}</button>;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* STEP 2 — datasets per sector */}
          {d.step === 2 && (
            <section>
              <h2 className="text-lg font-bold text-navy">{t("datasets.title")}</h2>
              <p className="mb-4 text-sm text-muted">{t("datasets.sub")}</p>

              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {d.sectors.map((id) => {
                  const s = sectorById(id)!;
                  const n = stats.bySector[id] ?? 0;
                  return (
                    <button type="button" key={id} onClick={() => setActiveSector(id)} className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition ${activeSector === id ? "border-navy bg-navy text-white" : "border-line bg-white text-ink hover:border-teal"}`}>
                      <span>{s.icon}</span>{sector(s).label}
                      {n > 0 && <span className={`rounded-full px-1.5 text-xs ${activeSector === id ? "bg-white/20" : "bg-teal-50 text-teal"}`}>{n}</span>}
                    </button>
                  );
                })}
              </div>

              <input className="field mb-4" placeholder={t("datasets.search")} value={filter} onChange={(e) => setFilter(e.target.value)} />

              {(() => {
                const s = sectorById(activeSector);
                if (!s) return null;
                const q = filter.trim().toLowerCase();
                return visibleGroups(s, d.subsectors).map((g) => {
                  // Search both the displayed language and English, so either works.
                  const items = g.items.filter((i) => !q || [i.label, i.hint, itemText(i).label, itemText(i).hint].some((x) => x?.toLowerCase().includes(q)));
                  if (!items.length) return null;
                  return (
                    <div key={g.id} className="mb-5">
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-teal">{group(g)}</h3>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            sectorId={s.id}
                            value={d.items[item.id]}
                            submissionId={d.id}
                            startedAt={d.startedAt}
                            defaultCountry={d.contact.country}
                            onChange={(v) => {
                              const next = { ...d.items };
                              if (v) next[item.id] = v; else delete next[item.id];
                              up({ items: next });
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Other datasets */}
              <div className="card mt-6">
                <h3 className="font-bold text-navy">{t("other.title")}</h3>
                <p className="mb-3 text-sm text-muted">{t("other.sub")}</p>
                <div className="space-y-3">
                  {d.others.map((o, idx) => {
                    const setO = (patch: Partial<OtherRow>) => up({ others: d.others.map((x) => (x.rowId === o.rowId ? { ...x, ...patch } : x)) });
                    return (
                      <div key={o.rowId} className="rounded-xl border border-line p-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input className="field" placeholder={t("other.name")} value={o.name} onChange={(e) => setO({ name: e.target.value })} />
                          <select className="field" value={o.sectorId} onChange={(e) => setO({ sectorId: e.target.value })}>
                            <option value="">{t("other.sector")}</option>
                            {SECTORS.map((s) => <option key={s.id} value={s.id}>{sector(s).label}</option>)}
                          </select>
                          <input className="field sm:col-span-2" placeholder={t("other.desc")} value={o.description} onChange={(e) => setO({ description: e.target.value })} />
                          <input className="field" placeholder={t("other.coverage")} value={o.coverage} onChange={(e) => setO({ coverage: e.target.value })} />
                          <div className="grid grid-cols-2 gap-2">
                            <input className="field" placeholder={t("other.years")} value={o.years} onChange={(e) => setO({ years: e.target.value })} />
                            <input className="field" placeholder={t("other.format")} value={o.format} onChange={(e) => setO({ format: e.target.value })} />
                          </div>
                        </div>
                        <div className="mt-2">
                          <FileUploader submissionId={d.id} startedAt={d.startedAt} sectorId="other" itemId={`other-${idx + 1}`} files={o.files} onChange={(files) => setO({ files })} />
                        </div>
                        <button type="button" className="mt-2 text-xs text-muted hover:text-red-600" onClick={() => up({ others: d.others.filter((x) => x.rowId !== o.rowId) })}>{t("other.remove")}</button>
                      </div>
                    );
                  })}
                </div>
                <button type="button" className="btn-ghost mt-3" onClick={() => up({ others: [...d.others, { rowId: crypto.randomUUID(), name: "", description: "", sectorId: activeSector, coverage: "", years: "", format: "", files: [] }] })}>{t("other.add")}</button>
              </div>
            </section>
          )}

          {/* STEP 3 — sharing & progress */}
          {d.step === 3 && (
            <section className="space-y-5">
              <div className="card">
                <h2 className="text-lg font-bold text-navy">{t("sharing.title")}</h2>
                <p className="mb-4 text-sm text-muted">{t("sharing.sub")}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ACCESS.map((a) => (
                    <label key={a} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm transition ${d.sharing.access === a ? "border-teal bg-teal-50" : "border-line hover:border-teal/50"}`}>
                      <input type="radio" name="access" className="accent-teal" checked={d.sharing.access === a} onChange={() => up({ sharing: { ...d.sharing, access: a } })} />
                      {option(a)}
                    </label>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div><label className="label">{t("sharing.approver")}</label><input className="field" placeholder={t("sharing.approverPh")} value={d.sharing.approver} onChange={(e) => up({ sharing: { ...d.sharing, approver: e.target.value } })} /></div>
                  <div><label className="label">{t("sharing.portal")}</label><input className="field" type="url" placeholder="https://" value={d.sharing.portal} onChange={(e) => up({ sharing: { ...d.sharing, portal: e.target.value } })} /></div>
                </div>
              </div>
              <div className="card space-y-4">
                <h2 className="text-lg font-bold text-navy">{t("progress.title")}</h2>
                {([
                  ["done", "progress.done", "progress.donePh"],
                  ["next3Months", "progress.next", "progress.nextPh"],
                  ["support", "progress.support", "progress.supportPh"],
                ] as const).map(([k, l, ph]) => (
                  <div key={k}>
                    <label className="label">{t(l)}</label>
                    <textarea className="field min-h-24" placeholder={t(ph)} value={d.progress[k]} onChange={(e) => up({ progress: { ...d.progress, [k]: e.target.value } })} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* STEP 4 — review */}
          {d.step === 4 && (
            <section className="space-y-4">
              <div className="card">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-bold text-navy">{t("review.title")}</h2>
                  <button className="text-sm text-teal hover:underline" onClick={() => go(0)}>{t("review.edit")}</button>
                </div>
                <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {([["review.name", d.contact.name], ["review.designation", d.contact.designation], ["review.affiliation", d.contact.affiliation], ["review.country", d.contact.country ? countryName(d.contact.country) : ""], ["review.email", d.contact.email], ["review.contact", d.contact.phone]] as const).map(([k, v]) => (
                    <div key={k}><dt className="text-xs text-muted">{t(k)}</dt><dd className="font-medium">{v || "—"}</dd></div>
                  ))}
                </dl>
              </div>
              {d.sectors.map((id) => {
                const s = sectorById(id)!;
                const items = Object.values(d.items).filter((i) => i.sectorId === id);
                return (
                  <div key={id} className="card">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-navy">{s.icon} {sector(s).label}</h3>
                      <button className="text-sm text-teal hover:underline" onClick={() => { setActiveSector(id); go(2); }}>{t("review.edit")}</button>
                    </div>
                    {items.length === 0 ? (
                      <p className="mt-2 text-sm text-muted">{t("review.none")}</p>
                    ) : (
                      <ul className="mt-2 divide-y divide-line text-sm">
                        {items.map((i) => {
                          const found = s.groups.flatMap((g) => g.items).find((x) => x.id === i.itemId);
                          const label = found && itemText(found).label;
                          return (
                            <li key={i.itemId} className="flex flex-wrap justify-between gap-2 py-2">
                              <span className="font-medium">{label}</span>
                              <span className="text-xs text-muted">
                                {[i.frequency && option(i.frequency), i.yearFrom && `${i.yearFrom}–${i.yearTo || "…"}`, i.globalCoverage ? t("review.global") : i.countries.map(countryName).join(", ")].filter(Boolean).join(" · ") || t("review.noDetails")}
                                {i.files.length > 0 && ` · 📎 ${i.files.length}`}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
              {d.others.some((o) => o.name.trim()) && (
                <div className="card">
                  <h3 className="font-bold text-navy">{t("review.others")}</h3>
                  <ul className="mt-2 list-disc pl-5 text-sm">{d.others.filter((o) => o.name.trim()).map((o) => <li key={o.rowId}>{o.name}{o.files.length ? ` · 📎 ${o.files.length}` : ""}</li>)}</ul>
                </div>
              )}
            </section>
          )}

          {/* Nav buttons */}
          <div className="mt-6 flex items-center justify-between">
            {d.step > 0 ? <button className="btn-ghost" onClick={() => go(d.step - 1)}>{t("nav.back")}</button> : <span />}
            {d.step < 4 ? (
              <button className="btn-primary" onClick={() => go(d.step + 1)}>{d.step === 3 ? t("step.review") : t("nav.continue")} →</button>
            ) : (
              <button className="btn-primary bg-teal hover:bg-teal/90" disabled={submitting} onClick={submit}>{submitting ? t("nav.submitting") : t("nav.submit")}</button>
            )}
          </div>
        </div>

        {/* Live summary sidebar */}
        <aside className="order-first lg:order-none">
          <div className="card sticky top-4 !p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-muted">{t("side.title")}</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-ice p-3"><div className="text-2xl font-bold text-navy tabular-nums">{stats.datasets}</div><div className="text-[11px] text-muted">{t("side.datasets")}</div></div>
              <div className="rounded-xl bg-ice p-3"><div className="text-2xl font-bold text-navy tabular-nums">{stats.files}</div><div className="text-[11px] text-muted">{t("side.files")}</div></div>
            </div>
            {d.sectors.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm">
                {d.sectors.map((id) => {
                  const s = sectorById(id)!;
                  const total = visibleGroups(s, d.subsectors).reduce((n, g) => n + g.items.length, 0);
                  const n = stats.bySector[id] ?? 0;
                  return (
                    <li key={id}>
                      <div className="flex justify-between text-xs"><span>{s.icon} {sector(s).label}</span><span className="text-muted">{n}/{total}</span></div>
                      <div className="mt-0.5 h-1 rounded bg-line"><div className="h-1 rounded bg-teal transition-all duration-500" style={{ width: `${(n / total) * 100}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3 text-[11px] text-muted">{savedAt ? t("side.saved", { time: savedAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) }) : t("intro.autosave")}</div>
            <button className="mt-1 text-[11px] text-muted underline hover:text-red-600" onClick={() => { if (confirm(t("side.confirm"))) { setD(newDraft()); setInvalid([]); } }}>{t("side.startOver")}</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
