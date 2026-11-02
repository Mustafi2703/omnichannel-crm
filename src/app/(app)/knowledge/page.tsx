"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, FileText, RefreshCw, Sparkles, Trash2, Upload } from "lucide-react";
import { useLocale } from "@/components/ClientProviders";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { t } from "@/lib/i18n";
import {
  KNOWLEDGE_CATEGORIES,
  knowledgeCategoryLabel,
  type KnowledgeCategoryId,
} from "@/lib/knowledge-categories";

type KnowledgeDoc = {
  id: string;
  title: string;
  content: string;
  category: string;
  sourceFilename?: string | null;
  status: string;
  errorMessage?: string | null;
  embeddingIndex?: { provider: string; model: string; dimensions: number; version: string } | null;
  updatedAt: string;
};

export default function KnowledgePage() {
  const { locale } = useLocale();
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [filter, setFilter] = useState<KnowledgeCategoryId | "all">("all");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<KnowledgeCategoryId>("general_information");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/knowledge");
    const data = await response.json();
    setDocs(data.docs || []);
    setCanManage(Boolean(data.canManage));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => (filter === "all" ? docs : docs.filter((doc) => doc.category === filter)),
    [docs, filter],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const doc of docs) map[doc.category] = (map[doc.category] || 0) + 1;
    return map;
  }, [docs]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      let response: Response;
      if (file) {
        const form = new FormData();
        form.set("title", title);
        form.set("category", category);
        form.set("file", file);
        response = await fetch("/api/knowledge", { method: "POST", body: form });
      } else {
        response = await fetch("/api/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, category }),
        });
      }
      if (!response.ok) throw new Error((await response.json()).error || "Upload failed");
      setTitle("");
      setContent("");
      setFile(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function action(id: string, method: "PATCH" | "DELETE", body?: object) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/knowledge/${id}`, {
        method,
        headers: method === "PATCH" ? { "Content-Type": "application/json" } : undefined,
        body: method === "PATCH" ? JSON.stringify(body || { action: "reindex" }) : undefined,
      });
      if (!response.ok) throw new Error((await response.json()).error || "Action failed");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpen}
        title={t(locale, "knowledge")}
        description={
          locale === "tr"
            ? "CORE · FUNDAMENTAL · PRODUCT · FAQ gruplarına göre yönetilen bilgi bankası."
            : "Knowledge bank grouped as CORE · FUNDAMENTAL · PRODUCT · FAQ for AI grounding."
        }
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${filterPillClass(filter === "all")}`}
        >
          {locale === "tr" ? "Tümü" : "All"} ({docs.length})
        </button>
        {KNOWLEDGE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${filterPillClass(filter === cat.id)}`}
            title={locale === "tr" ? cat.descriptionTr : cat.descriptionEn}
          >
            {locale === "tr" ? cat.labelTr : cat.labelEn}
            <span className="opacity-70">({counts[cat.id] || 0})</span>
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <div className={canManage ? "grid items-start gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]" : ""}>
        {canManage && (
          <form onSubmit={submit} className="ea-card-pad space-y-4">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-ea-50 text-ea-600">
                <Upload className="h-4 w-4" />
              </div>
              <h2 className="ea-section-title">{locale === "tr" ? "Bilgi ekle" : "Add knowledge"}</h2>
            </div>
            <div className="grid gap-3">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={locale === "tr" ? "Başlık (dosya için isteğe bağlı)" : "Title (optional for file)"}
                className="ea-input"
              />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as KnowledgeCategoryId)}
                className="ea-input"
              >
                {KNOWLEDGE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    [{cat.role}] {locale === "tr" ? cat.labelTr : cat.labelEn}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="block w-full rounded-xl border border-dashed border-ea-200 bg-ea-50/40 p-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ea-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-ea-700"
            />
            {!file && (
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={locale === "tr" ? "Onaylı SSS veya ürün içeriğini buraya yapıştırın" : "Paste approved FAQ or product content"}
                rows={7}
                className="ea-input"
              />
            )}
            <p className="text-xs text-slate-500">PDF, DOCX, TXT, Markdown, CSV · max 10 MB</p>
            <button disabled={busy} className="ea-btn-primary w-full sm:w-auto">
              <Sparkles className="h-4 w-4" />
              {busy ? "…" : locale === "tr" ? "İndeksle" : "Index"}
            </button>
          </form>
        )}

        <div className="min-w-0 space-y-3">
          {visible.map((doc) => (
            <article key={doc.id} className="ea-card-pad">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="mt-0.5 hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-ea-50 text-ea-600 sm:grid">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="ea-chip uppercase">{knowledgeCategoryLabel(doc.category, locale)}</span>
                      <span className={`${statusChipClass(doc.status)} uppercase`}>{doc.status}</span>
                    </div>
                    <h2 className="break-words font-semibold text-ea-950">{doc.title}</h2>
                    <p className="mt-1 break-words text-xs text-slate-500">
                      {doc.sourceFilename || (locale === "tr" ? "Yazılı içerik" : "Pasted content")}
                      {doc.embeddingIndex
                        ? ` · ${doc.embeddingIndex.provider}/${doc.embeddingIndex.model} · ${doc.embeddingIndex.dimensions}d · ${doc.embeddingIndex.version}`
                        : ""}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      disabled={busy}
                      value={doc.category}
                      onChange={(event) => action(doc.id, "PATCH", { category: event.target.value })}
                      className="ea-input w-auto py-1.5 text-xs"
                    >
                      {KNOWLEDGE_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {locale === "tr" ? cat.labelTr : cat.labelEn}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={busy}
                      onClick={() => action(doc.id, "PATCH", { action: "reindex" })}
                      className="ea-btn-sm"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {locale === "tr" ? "Yeniden indeksle" : "Re-index"}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => action(doc.id, "DELETE")}
                      className="ea-btn-danger rounded-lg px-2.5 py-1.5 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {locale === "tr" ? "Sil" : "Delete"}
                    </button>
                  </div>
                )}
              </div>
              {doc.errorMessage && <p className="mt-3 break-words rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{doc.errorMessage}</p>}
              <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm text-slate-600">{doc.content}</p>
            </article>
          ))}
          {!visible.length && (
            <div className="ea-card">
              <EmptyState
                icon={BookOpen}
                title={locale === "tr" ? "Bu kategoride henüz belge yok." : "No documents in this category yet."}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function filterPillClass(active: boolean) {
  return active
    ? "bg-ea-600 text-white shadow-sm shadow-ea-600/25"
    : "border border-ea-900/10 bg-white text-slate-600 hover:border-ea-500/40 hover:text-ea-800";
}

function statusChipClass(status: string) {
  const value = status.toLowerCase();
  if (["ready", "indexed", "active", "completed"].includes(value))
    return "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/15";
  if (["failed", "error"].includes(value))
    return "inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/15";
  if (["processing", "pending", "queued", "indexing"].includes(value))
    return "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/15";
  return "ea-chip-neutral";
}
