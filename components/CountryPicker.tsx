"use client";
import { useMemo, useState } from "react";
import { useI18n } from "./LanguageProvider";

const english = new Intl.DisplayNames(["en"], { type: "region" });

export default function CountryPicker(props: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const { t, countries, countryName } = useI18n();
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    // Match the local-language name or the English one (people often type country names in English).
    return countries.filter((c) => !props.value.includes(c.code) && (c.name.toLowerCase().includes(s) || english.of(c.code)?.toLowerCase().includes(s))).slice(0, 8);
  }, [q, props.value, countries]);

  const add = (code: string) => { props.onChange([...props.value, code]); setQ(""); };

  return (
    <div className="relative">
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/20">
        {props.value.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 rounded-full bg-teal px-2.5 py-0.5 text-xs text-white">
            {countryName(c)}
            <button type="button" onClick={() => props.onChange(props.value.filter((x) => x !== c))} aria-label={t("up.remove", { name: countryName(c) })}>✕</button>
          </span>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches[0]) { e.preventDefault(); add(matches[0].code); }
            if (e.key === "Backspace" && !q && props.value.length) props.onChange(props.value.slice(0, -1));
          }}
          placeholder={props.value.length ? t("country.addAnother") : props.placeholder ?? t("country.type")}
          className="min-w-32 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none"
        />
      </div>
      {matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-lg">
          {matches.map((c) => (
            <li key={c.code}>
              <button type="button" onClick={() => add(c.code)} className="w-full px-3 py-1.5 text-left text-sm hover:bg-ice">{c.name}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
