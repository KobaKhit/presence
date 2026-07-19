/**
 * Build / refresh persisted embeddings for wiki + source documents.
 * Uses centralized LLM embeddings (OpenRouter → OpenAI). No-op without a key.
 */

import { getWikiPages } from "@/lib/content/loaders";
import { getEntries } from "@/lib/content/entries";
import { llmEmbed, getLlmStatus } from "@/lib/llm";
import { hashContent } from "./vector";
import {
  openVectorStore,
  type VectorKind,
  type VectorRecord,
  type VectorStore,
} from "./vector-store";

export interface ReindexResult {
  backend: "sqlite" | "pgvector" | "none";
  provider: string | null;
  model: string | null;
  upserted: number;
  skipped: number;
  deleted: number;
  total: number;
  errors: string[];
}

function embedText(title: string, summary: string, content: string): string {
  return `${title}\n${summary}\n${content.slice(0, 2000)}`;
}

async function collectDocs(): Promise<
  { id: string; kind: VectorKind; slug: string; text: string }[]
> {
  const [wiki, entries] = await Promise.all([getWikiPages(), getEntries()]);
  return [
    ...wiki.map((p) => ({
      id: `wiki:${p.slug}`,
      kind: "wiki" as const,
      slug: p.slug,
      text: embedText(p.title, p.summary, p.content),
    })),
    ...entries.map((e) => ({
      id: `source:entries/${e.slug}`,
      kind: "source" as const,
      slug: `entries/${e.slug}`,
      text: embedText(e.title, e.summary, e.content),
    })),
  ];
}

/**
 * Persist embeddings for changed documents. Safe to call without an LLM key
 * (returns backend none / empty upserts).
 */
export async function reindexEmbeddings(
  store?: VectorStore,
): Promise<ReindexResult> {
  const status = getLlmStatus();
  const result: ReindexResult = {
    backend: "none",
    provider: status.configured ? status.provider : null,
    model: status.embeddingModel,
    upserted: 0,
    skipped: 0,
    deleted: 0,
    total: 0,
    errors: [],
  };

  const owned = !store;
  const vectorStore = store ?? (await openVectorStore());
  result.backend = vectorStore.backend;

  try {
    const docs = await collectDocs();
    result.total = docs.length;
    const hashes = await vectorStore.getHashes(docs.map((d) => d.id));
    const model = status.embeddingModel ?? "none";

    const needs: typeof docs = [];
    for (const doc of docs) {
      const h = hashContent(doc.text);
      const prev = hashes.get(doc.id);
      if (prev && prev.contentHash === h && prev.model === model && status.configured) {
        result.skipped++;
      } else if (!status.configured) {
        result.skipped++;
      } else {
        needs.push(doc);
      }
    }

    if (!status.configured) {
      result.errors.push(
        "No OPENROUTER_API_KEY / OPENAI_API_KEY — skipped embedding upserts (store kept).",
      );
      result.deleted = await vectorStore.deleteMissing(docs.map((d) => d.id));
      result.total = await vectorStore.count();
      return result;
    }

    const batchSize = 16;
    for (let i = 0; i < needs.length; i += batchSize) {
      const batch = needs.slice(i, i + batchSize);
      const embedded = await llmEmbed(batch.map((d) => d.text));
      if (!embedded) {
        result.errors.push(`Embedding batch at ${i} failed`);
        continue;
      }
      const records: VectorRecord[] = batch.map((doc, j) => ({
        id: doc.id,
        kind: doc.kind,
        slug: doc.slug,
        model: embedded.model,
        embedding: embedded.embeddings[j],
        contentHash: hashContent(doc.text),
      }));
      await vectorStore.upsert(records);
      result.upserted += records.length;
    }

    result.deleted = await vectorStore.deleteMissing(docs.map((d) => d.id));
    result.total = await vectorStore.count();
    return result;
  } finally {
    if (owned) await vectorStore.close?.();
  }
}
