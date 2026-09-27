"use client";
import { MESSAGES } from "@/lib/i18n/messages";
import { useI18n } from "./LanguageProvider";
import { useIsAdmin } from "./LanguageSwitcher";

type Logo = { src: string; alt: string };

/** Partner strip: convening organisation and technical-support logos. Hidden when neither logo file exists. */
export default function SiteFooter({ convener, support }: { convener?: Logo; support?: Logo }) {
  const { t } = useI18n();
  const label = useIsAdmin() ? (k: "footer.convened" | "footer.support") => MESSAGES.en[k] : t;
  const cols = [
    convener && { title: label("footer.convened"), logo: convener },
    support && { title: label("footer.support"), logo: support },
  ].filter(Boolean) as { title: string; logo: Logo }[];
  if (!cols.length) return null;

  return (
    <footer className="mt-10 border-t border-line bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-8 px-4 py-8 sm:flex-row sm:items-start sm:gap-0 sm:divide-x sm:divide-line">
        {cols.map((c) => (
          <div key={c.logo.src} className="flex flex-col items-center gap-4 sm:px-12">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{c.title}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.logo.src} alt={c.logo.alt} className="h-16 w-auto" />
          </div>
        ))}
      </div>
    </footer>
  );
}
