"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useI18n } from "./LanguageProvider";

const english = new Intl.DisplayNames(["en"], { type: "region" });

/** Single-choice, type-to-search country picker (ARIA combobox). Value is an ISO code or "". */
export default function CountrySelect(props: { id?: string; value: string; onChange: (code: string) => void }) {
  const { t, countries, countryName } = useI18n();
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return countries;
    // Local-language or English name; names starting with the query come first.
    const hits = countries.filter((c) => c.name.toLowerCase().includes(s) || english.of(c.code)?.toLowerCase().includes(s));
    const starts = (c: { code: string; name: string }) => c.name.toLowerCase().startsWith(s) || !!english.of(c.code)?.toLowerCase().startsWith(s);
    return [...hits.filter(starts), ...hits.filter((c) => !starts(c))];
  }, [q, countries]);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) close(); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted option in view while using the arrow keys.
  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function openList() {
    setOpen(true);
    setQ("");
    setActive(Math.max(0, countries.findIndex((c) => c.code === props.value)));
  }
  function close() { setOpen(false); setQ(""); }
  function pick(code: string) { props.onChange(code); close(); }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) { e.preventDefault(); openList(); return; }
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (matches[active]) pick(matches[active].code); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") close();
  }

  return (
    <div ref={wrap} className="relative">
      <input
        id={props.id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].code}` : undefined}
        autoComplete="off"
        className="field pr-16"
        placeholder={props.value ? countryName(props.value) : t("country.type")}
        value={open ? q : props.value ? countryName(props.value) : ""}
        onFocus={openList}
        onClick={() => !open && openList()}
        onChange={(e) => { setQ(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={onKeyDown}
      />
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-2 text-muted">
        {props.value && !open && (
          <button type="button" className="pointer-events-auto text-xs hover:text-red-600" aria-label={t("up.remove", { name: countryName(props.value) })} onClick={() => props.onChange("")}>✕</button>
        )}
        <span aria-hidden className={`text-xs transition ${open ? "rotate-180" : ""}`}>▾</span>
      </div>

      {open && (
        <ul ref={list} id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-lg">
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-muted">—</li>}
          {matches.map((c, i) => (
            <li
              key={c.code}
              id={`${listId}-${c.code}`}
              role="option"
              aria-selected={c.code === props.value}
              onMouseDown={(e) => { e.preventDefault(); pick(c.code); }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center justify-between px-3 py-1.5 text-sm ${i === active ? "bg-ice" : ""} ${c.code === props.value ? "font-semibold text-navy" : ""}`}
            >
              {c.name}
              {c.code === props.value && <span className="text-teal">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
