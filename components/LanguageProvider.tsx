"use client";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LANGS, MESSAGES, type Lang, type MessageKey } from "@/lib/i18n/messages";
import { CATALOG } from "@/lib/i18n/catalog";
import { localCountries } from "@/lib/countries";
import type { DataItem, ItemGroup, Sector } from "@/lib/sectors";

const STORAGE_KEY = "portal-lang";
const isLang = (v: unknown): v is Lang => LANGS.some((l) => l.code === v);

function useI18nValue() {
  const [lang, setLangState] = useState<Lang>("en");

  // Server render is English; switch to the saved (or browser) language after mount.
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch {}
    const browser = navigator.language?.slice(0, 2);
    const initial = isLang(saved) ? saved : isLang(browser) ? browser : "en";
    if (initial !== "en") setLangState(initial);
  }, []);
  const admin = usePathname()?.startsWith("/admin");
  useEffect(() => { document.documentElement.lang = admin ? "en" : lang; }, [lang, admin]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  return useMemo(() => {
    const dict = MESSAGES[lang];
    const cat = CATALOG[lang];
    const countries = localCountries(lang);
    return {
      lang,
      setLang,
      t: (key: MessageKey, vars?: Record<string, string | number>) =>
        (dict[key] ?? MESSAGES.en[key]).replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? String(vars[k]) : m)),
      sector: (s: Sector) => cat?.sectors[s.id] ?? { label: s.label, description: s.description },
      group: (g: ItemGroup) => cat?.groups[g.id] ?? g.label,
      item: (i: DataItem) => ({ label: cat?.items[i.id]?.label ?? i.label, hint: cat?.items[i.id]?.hint ?? i.hint }),
      /** Display text for a stored option value (LEVELS, FREQUENCIES, FORMATS, ACCESS). */
      option: (v: string) => cat?.options[v] ?? v,
      countryName: countries.name,
      countries: countries.list,
      /** Locale for dates/times; undefined keeps the browser default in English. */
      locale: lang === "en" ? undefined : `${lang}-LK`,
    };
  }, [lang, setLang]);
}

type I18n = ReturnType<typeof useI18nValue>;
const Ctx = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={useI18nValue()}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used inside <LanguageProvider>");
  return v;
}
