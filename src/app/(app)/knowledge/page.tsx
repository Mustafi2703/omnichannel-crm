"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/ClientProviders";
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
      <div>
        <h1 className="text-2xl font-black">{t(locale, "knowledge")}</h1>
        <p className="text-sm text-slate-500">
          {locale === "tr"
            ? "CORE · FUNDAMENTAL · PRODUCT · FAQ gruplarına göre yönetilen bilgi bankası."
            : "Knowledge bank grouped as CORE · FUNDAMENTAL · PRODUCT · FAQ for AI grounding."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === "all" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}
        >
          {locale === "tr" ? "Tümü" : "All"} ({docs.length})
        </button>
        {KNOWLEDGE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === cat.id ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}
            title={locale === "tr" ? cat.descriptionTr : cat.descriptionEn}
          >
            {locale === "tr" ? cat.labelTr : cat.labelEn}
            <span className="ml-1 opacity-70">({counts[cat.id] || 0})</span>
          </button>
        ))}
      </div>

      {canManage && (
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">{locale === "tr" ? "Bilgi ekle" : "Add knowledge"}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={locale === "tr" ? "Başlık (dosya için isteğe bağlı)" : "Title (optional for file)"}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as KnowledgeCategoryId)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
            className="block w-full text-sm"
          />
          {!file && (
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={locale === "tr" ? "Onaylı SSS veya ürün içeriğini buraya yapıştırın" : "Paste approved FAQ or product content"}
              rows={7}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          )}
          <p className="text-xs text-slate-500">PDF, DOCX, TXT, Markdown, CSV · max 10 MB</p>
          <button disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy ? "…" : locale === "tr" ? "İndeksle" : "Index"}
          </button>
        </form>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {visible.map((doc) => (
          <article key={doc.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                    {knowledgeCategoryLabel(doc.category, locale)}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-400">{doc.status}</span>
                </div>
                <h2 className="font-bold">{doc.title}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {doc.sourceFilename || (locale === "tr" ? "Yazılı içerik" : "Pasted content")}
                  {doc.embeddingIndex
                    ? ` · ${doc.embeddingIndex.provider}/${doc.embeddingIndex.model} · ${doc.embeddingIndex.dimensions}d · ${doc.embeddingIndex.version}`
                    : ""}
                </p>
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <select
                    disabled={busy}
                    value={doc.category}
                    onChange={(event) => action(doc.id, "PATCH", { category: event.target.value })}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
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
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                  >
                    {locale === "tr" ? "Yeniden indeksle" : "Re-index"}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => action(doc.id, "DELETE")}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
                  >
                    {locale === "tr" ? "Sil" : "Delete"}
                  </button>
                </div>
              )}
            </div>
            {doc.errorMessage && <p className="mt-3 text-sm text-red-600">{doc.errorMessage}</p>}
            <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{doc.content}</p>
          </article>
        ))}
        {!visible.length && (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {locale === "tr" ? "Bu kategoride henüz belge yok." : "No documents in this category yet."}
          </p>
        )}
      </div>
    </div>
  );
}
