import AdminNav from "@/components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy px-4 py-3 text-white">
        <span className="text-sm font-semibold">🔒 Admin</span>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
