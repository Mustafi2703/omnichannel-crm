"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { useLocale } from "@/components/ClientProviders";
import { t } from "@/lib/i18n";

type ContactRow = {
  id: string;
  displayName: string;
  companyName?: string | null;
  source: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  _count?: { leads: number; conversations: number };
};

type Pagination = { page: number; pageSize: number; total: number };

export default function ContactsPage() {
  const { locale } = useLocale();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 25, total: 0 });
  const [view, setView] = useState<"table" | "cards">("table");
  const [q, setQ] = useState("");

  async function load(page = 1, query = q) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pagination.pageSize),
      ...(query.trim() ? { q: query.trim() } : {}),
    });
    const response = await fetch(`/api/contacts?${params}`);
    const data = await response.json();
    setContacts(data.contacts || []);
    setPagination(data.pagination || { page, pageSize: 25, total: 0 });
  }

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / pagination.pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{t(locale, "contacts")}</h1>
          <p className="text-sm text-slate-500">
            {locale === "tr"
              ? "Varsayılan görünüm: sayfalı veri tablosu."
              : "Default view: paginated data table."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load(1, q)}
            placeholder={t(locale, "search")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button
            onClick={() => void load(1, q)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
          >
            {t(locale, "search")}
          </button>
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              onClick={() => setView("table")}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold ${view === "table" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              <Table2 className="h-3.5 w-3.5" /> Table
            </button>
            <button
              onClick={() => setView("cards")}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold ${view === "cards" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Cards
            </button>
          </div>
        </div>
      </div>

      {view === "table" ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">{locale === "tr" ? "Ad" : "Name"}</th>
                <th className="px-4 py-3">{locale === "tr" ? "Şirket" : "Company"}</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">{locale === "tr" ? "Telefon" : "Phone"}</th>
                <th className="px-4 py-3">{locale === "tr" ? "Şehir" : "City"}</th>
                <th className="px-4 py-3">{t(locale, "source")}</th>
                <th className="px-4 py-3">Leads</th>
                <th className="px-4 py-3">Conv</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-semibold">{c.displayName}</td>
                  <td className="px-4 py-3 text-slate-600">{c.companyName || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.city || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                      {c.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c._count?.leads || 0}</td>
                  <td className="px-4 py-3">{c._count?.conversations || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!contacts.length && (
            <p className="p-8 text-center text-sm text-slate-500">
              {locale === "tr" ? "Kişi bulunamadı." : "No contacts found."}
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {contacts.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold">{c.displayName}</div>
                  <div className="text-sm text-slate-500">{c.companyName || "—"}</div>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-700">
                  {c.source}
                </span>
              </div>
              <div className="mt-4 space-y-1 text-sm text-slate-600">
                <div>{c.email || "—"}</div>
                <div>{c.phone || "—"}</div>
                <div>{c.city || "—"}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">
          {pagination.total} {locale === "tr" ? "kayıt" : "records"} · {locale === "tr" ? "Sayfa" : "Page"}{" "}
          {pagination.page}/{totalPages}
        </span>
        <div className="flex gap-2">
          <button
            disabled={pagination.page <= 1}
            onClick={() => void load(pagination.page - 1)}
            className="rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-40"
          >
            Prev
          </button>
          <button
            disabled={pagination.page >= totalPages}
            onClick={() => void load(pagination.page + 1)}
            className="rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
