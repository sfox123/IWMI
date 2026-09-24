"use client";
import { usePathname } from "next/navigation";
import { LANGS, MESSAGES, type Lang } from "@/lib/i18n/messages";
import { useI18n } from "./LanguageProvider";

// The admin area is English-only: no dropdown there, and the header title stays English.
const useIsAdmin = () => usePathname()?.startsWith("/admin") ?? false;

export function SiteTitle({ custom }: { custom?: string }) {
  const { t } = useI18n();
  const admin = useIsAdmin();
  return <>{custom || (admin ? MESSAGES.en["header.title"] : t("header.title"))}</>;
}

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  if (useIsAdmin()) return null;
  return (
    <label className="flex items-center gap-2 text-sm">
      <span aria-hidden className="text-muted">🌐</span>
      <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" aria-label={t("header.language")}>
        {LANGS.map((l) => <option key={l.code} value={l.code} lang={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
}
