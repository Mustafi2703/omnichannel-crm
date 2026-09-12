"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/ClientProviders";
import { t } from "@/lib/i18n";

type KnowledgeDoc = {
  id: string;
  title: string;
  content: string;
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
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      let response: Response;
      if (file) {
        const form = new FormData();
        form.set("title", title);
        form.set("file", file);
        response = await fetch("/api/knowledge", { method: "POST", body: form });
      } else {
        response = await fetch("/api/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
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

  async function action(id: string, method: "PATCH" | "DELETE") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/knowledge/${id}`, {
        method,
        headers: method === "PATCH" ? { "Content-Type": "application/json" } : undefined,
        body: method === "PATCH" ? JSON.stringify({ action: "reindex" }) : undefined,
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
            ? "Onaylı içerik parçalara ayrılır, vektörlenir ve AI yanıtlarından önce aranır."
            : "Approved content is chunked, embedded, and retrieved before AI replies."}
        </p>
      </div>

      {canManage && (
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">{locale === "tr" ? "Bilgi ekle" : "Add knowledge"}</h2>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={locale === "tr" ? "Başlık (dosya için isteğe bağlı)" : "Title (optional for file)"} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input type="file" accept=".pdf,.docx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv" onChange={(event) => setFile(event.target.files?.[0] || null)} className="block w-full text-sm" />
          {!file && <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={locale === "tr" ? "Onaylı SSS veya ürün içeriğini buraya yapıştırın" : "Paste approved FAQ or product content"} rows={7} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />}
          <p className="text-xs text-slate-500">PDF, DOCX, TXT, Markdown, CSV · max 10 MB</p>
          <button disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "…" : locale === "tr" ? "İndeksle" : "Index"}</button>
        </form>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {docs.map((doc) => (
          <article key={doc.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold">{doc.title}</h2>
                <p className="mt-1 text-xs text-slate-500">{doc.sourceFilename || (locale === "tr" ? "Yazılı içerik" : "Pasted content")} · <span className="font-semibold uppercase">{doc.status}</span>{doc.embeddingIndex ? ` · ${doc.embeddingIndex.provider}/${doc.embeddingIndex.model} · ${doc.embeddingIndex.dimensions}d · ${doc.embeddingIndex.version}` : ""}</p>
              </div>
              {canManage && <div className="flex gap-2"><button disabled={busy} onClick={() => action(doc.id, "PATCH")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold">{locale === "tr" ? "Yeniden indeksle" : "Re-index"}</button><button disabled={busy} onClick={() => action(doc.id, "DELETE")} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">{locale === "tr" ? "Sil" : "Delete"}</button></div>}
            </div>
            {doc.status === "failed" && <p className="mt-3 text-sm text-red-700">{doc.errorMessage}</p>}
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap text-sm text-slate-600">{doc.content}</pre>
          </article>
        ))}
      </div>
    </div>
  );
}
