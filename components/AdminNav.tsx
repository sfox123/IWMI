"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["/admin", "Submissions"],
  ["/admin/datasets", "Datasets"],
  ["/admin/files", "Files"],
] as const;

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1">
      {TABS.map(([href, label]) => {
        const on = href === "/admin" ? path === "/admin" || /^\/admin\/[0-9a-f-]{36}$/.test(path) : path.startsWith(href);
        return <Link key={href} href={href} className={`rounded-lg px-3 py-1.5 text-sm transition ${on ? "bg-white text-navy font-semibold" : "text-white/80 hover:bg-white/10"}`}>{label}</Link>;
      })}
      <a href="/" className="rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10">View form ↗</a>
    </nav>
  );
}
