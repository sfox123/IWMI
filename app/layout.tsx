import type { Metadata } from "next";
import "./globals.css";
import fs from "node:fs";
import path from "node:path";
import { Noto_Sans_Sinhala, Noto_Sans_Tamil } from "next/font/google";
import { LanguageProvider } from "@/components/LanguageProvider";
import LanguageSwitcher, { SiteTitle } from "@/components/LanguageSwitcher";
import SiteFooter from "@/components/SiteFooter";

// Self-hosted Sinhala/Tamil fonts so the scripts render consistently on every device.
// Their unicode-range means English-only pages never download them.
const sinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], variable: "--font-sinhala", preload: false });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-tamil", preload: false });

// Logos: drop the files in public/ (svg, png, jpg or webp). Missing files are simply not shown.
//   dmc-logo.*   → header, and "Convened by" in the footer   (logo.* is still accepted for the header)
//   cgiar-logo.* → "Technical support" in the footer
const asset = (...names: string[]) => {
  const f = names.flatMap((n) => ["svg", "png", "jpg", "webp"].map((ext) => `${n}.${ext}`)).find((f) => fs.existsSync(path.join(process.cwd(), "public", f)));
  return f && `/${f}`;
};
const LOGO = asset("dmc-logo", "logo");
const DMC = asset("dmc-logo");
const CGIAR = asset("cgiar-logo");

const ORG = process.env.NEXT_PUBLIC_ORG_NAME ?? "IWMI";
const CUSTOM_TITLE = process.env.NEXT_PUBLIC_FORM_TITLE;
const TITLE = CUSTOM_TITLE ?? "Data Request Portal";

export const metadata: Metadata = { title: `${TITLE} · ${ORG}`, description: "Share the water, climate and sector data your organisation holds." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sinhala.variable} ${tamil.variable}`}>
      <body className="flex min-h-screen flex-col">
        <LanguageProvider>
          <header className="border-t-4 border-b border-t-amber border-b-line bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
              <a href="/" className="flex items-center gap-3">
                {LOGO ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={LOGO} alt={`${ORG} logo`} className="h-12 w-auto sm:h-14" />
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-lg text-white">≋</span>
                )}
                <span className="border-l border-line pl-3">
                  <span className="block text-base font-bold leading-tight text-navy sm:text-lg"><SiteTitle custom={CUSTOM_TITLE} /></span>
                  <span className="block text-[11px] uppercase tracking-wider text-muted">{ORG}</span>
                </span>
              </a>
              <LanguageSwitcher />
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">{children}</main>
          <SiteFooter
            convener={DMC ? { src: DMC, alt: "Disaster Management Centre, Sri Lanka" } : undefined}
            support={CGIAR ? { src: CGIAR, alt: "CGIAR Climate Action" } : undefined}
          />
        </LanguageProvider>
      </body>
    </html>
  );
}
