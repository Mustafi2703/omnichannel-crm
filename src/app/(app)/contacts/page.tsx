"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, Mail, MapPin, Phone, Search, Table2, Users } from "lucide-react";
import { useLocale } from "@/components/ClientProviders";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
      <PageHeader
        icon={Users}
        title={t(locale, "contacts")}
        description={
          locale === "tr"
            ? "Varsayılan görünüm: sayfalı veri tablosu."
            : "Default view: paginated data table."
        }
      />

      <div className="ea-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void load(1, q)}
              placeholder={t(locale, "search")}
              className="ea-input pl-9"
            />
          </div>
          <button onClick={() => void load(1, q)} className="ea-btn-primary shrink-0">
            {t(locale, "search")}
          </button>
        </div>
        <div className="ea-seg self-start sm:self-auto">
          <button
            onClick={() => setView("table")}
            className={cn("ea-seg-item", view === "table" && "ea-seg-item-active")}
          >
            <Table2 className="h-3.5 w-3.5" /> Table
          </button>
          <button
            onClick={() => setView("cards")}
            className={cn("ea-seg-item", view === "cards" && "ea-seg-item-active")}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </button>
        </div>
      </div>

      {view === "table" ? (
        <div className="ea-table-wrap">
          <table className="ea-table min-w-[820px]">
            <thead>
              <tr>
                <th>{locale === "tr" ? "Ad" : "Name"}</th>
                <th>{locale === "tr" ? "Şirket" : "Company"}</th>
                <th>Email</th>
                <th>{locale === "tr" ? "Telefon" : "Phone"}</th>
                <th>{locale === "tr" ? "Şehir" : "City"}</th>
                <th>{t(locale, "source")}</th>
                <th className="text-right">Leads</th>
                <th className="text-right">Conv</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={c.displayName} size="sm" />
                      <span className="font-semibold text-ea-950">{c.displayName}</span>
                    </div>
                  </td>
                  <td className="text-slate-600">{c.companyName || "—"}</td>
                  <td className="text-slate-600">{c.email || "—"}</td>
                  <td className="whitespace-nowrap text-slate-600">{c.phone || "—"}</td>
                  <td className="text-slate-600">{c.city || "—"}</td>
                  <td>
                    <span className="ea-chip uppercase">{c.source}</span>
                  </td>
                  <td className="text-right font-semibold tabular-nums text-ea-950">{c._count?.leads || 0}</td>
                  <td className="text-right font-semibold tabular-nums text-ea-950">{c._count?.conversations || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!contacts.length && (
            <EmptyState icon={Users} title={locale === "tr" ? "Kişi bulunamadı." : "No contacts found."} />
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {contacts.map((c) => (
            <div key={c.id} className="ea-card-pad transition hover:border-ea-500/30">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={c.displayName} size="md" />
                  <div className="min-w-0">
                    <div className="truncate text-base font-bold text-ea-950">{c.displayName}</div>
                    <div className="truncate text-sm text-slate-500">{c.companyName || "—"}</div>
                  </div>
                </div>
                <span className="ea-chip shrink-0 uppercase">{c.source}</span>
              </div>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                <div className="flex min-w-0 items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-ea-500" />
                  <span className="truncate">{c.email || "—"}</span>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-ea-500" />
                  <span className="truncate">{c.phone || "—"}</span>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-ea-500" />
                  <span className="truncate">{c.city || "—"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="ea-muted">
          {pagination.total} {locale === "tr" ? "kayıt" : "records"} · {locale === "tr" ? "Sayfa" : "Page"}{" "}
          {pagination.page}/{totalPages}
        </span>
        <div className="flex gap-2">
          <button
            disabled={pagination.page <= 1}
            onClick={() => void load(pagination.page - 1)}
            className="ea-btn-sm"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </button>
          <button
            disabled={pagination.page >= totalPages}
            onClick={() => void load(pagination.page + 1)}
            className="ea-btn-sm"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, size }: { name: string; size: "sm" | "md" }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-ea-500 to-aqua-500 font-bold text-white",
        size === "sm" ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-sm",
      )}
    >
      {initials}
    </div>
  );
}
