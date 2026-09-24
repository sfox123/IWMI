import type { Metadata } from "next";
import "./globals.css";
import fs from "node:fs";
import path from "node:path";
import { Noto_Sans_Sinhala, Noto_Sans_Tamil } from "next/font/google";
import { LanguageProvider } from "@/components/LanguageProvider";
import LanguageSwitcher, { SiteTitle } from "@/components/LanguageSwitcher";

// Self-hosted Sinhala/Tamil fonts so the scripts render consistently on every device.
// Their unicode-range means English-only pages never download them.
const sinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], variable: "--font-sinhala", preload: false });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-tamil", preload: false });

// Drop the official logo at public/logo.svg or public/logo.png and it will be used in the header.
const LOGO = ["logo.svg", "logo.png"].find((f) => fs.existsSync(path.join(process.cwd(), "public", f)));

const ORG = process.env.NEXT_PUBLIC_ORG_NAME ?? "IWMI";
const CUSTOM_TITLE = process.env.NEXT_PUBLIC_FORM_TITLE;
const TITLE = CUSTOM_TITLE ?? "Data Request Portal";

export const metadata: Metadata = { title: `${TITLE} · ${ORG}`, description: "Share the water, climate and sector data your organisation holds." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sinhala.variable} ${tamil.variable}`}>
      <body>
        <LanguageProvider>
          <header className="border-b border-line bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
              <a href="/" className="flex items-center gap-3">
                {LOGO ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/${LOGO}`} alt={`${ORG} logo`} className="h-10 w-auto" />
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-lg text-white">≋</span>
                )}
                <span>
                  <span className="block text-base font-bold leading-tight text-navy"><SiteTitle custom={CUSTOM_TITLE} /></span>
                  <span className="block text-xs text-muted">{ORG}</span>
                </span>
              </a>
              <LanguageSwitcher />
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">{children}</main>
        </LanguageProvider>
      </body>
    </html>
  );
}
