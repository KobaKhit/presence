import fs from "fs/promises";
import path from "path";
import Fuse from "fuse.js";
import { getWikiPages } from "@/lib/content/loaders";
import { getEntries } from "@/lib/content/entries";
import { llmEmbed } from "@/lib/llm";
import type {
  DoctorReport,
  KnowledgeDocument,
  KnowledgeProvider,
  SearchOptions,
  SearchResult,
  WikiGraph,
} from "./types";
import { openVectorStore, type VectorStore } from "./vector-store";

const GRAPH_PATH = path.join(process.cwd(), "content", "wiki-graph.json");

const STOPWORDS = new Set([
  "what", "when", "where", "which", "that", "this", "with", "from", "have", "been",
  "were", "will", "would", "could", "should", "about", "into", "your", "their",
  "there", "these", "those", "than", "then", "them", "they", "does", "did",
  "how", "did", "his", "her", "was", "are", "the", "and", "for", "influence",
]);

/**
 * Default KnowledgeProvider: LLM Wiki + graph-expanded hybrid retrieval.
 * Lexical (Fuse) + persisted vectors (SQLite / optional pgvector) + 1–2 hop graph expand.
 */
export class WikiKnowledgeProvider implements KnowledgeProvider {
  private storePromise: Promise<VectorStore> | null = null;

  private getStore(): Promise<VectorStore> {
    if (!this.storePromise) {
      this.storePromise = openVectorStore();
    }
    return this.storePromise;
  }

  async listPages(): Promise<KnowledgeDocument[]> {
    const pages = await getWikiPages();
    return pages.map((p) => ({
      id: `wiki:${p.slug}`,
      title: p.title,
      kind: "wiki" as const,
      slug: p.slug,
      summary: p.summary,
      content: p.content,
      links: p.links,
    }));
  }

  async getPage(slug: string): Promise<KnowledgeDocument | null> {
    const pages = await this.listPages();
    return pages.find((p) => p.slug === slug) ?? null;
  }

  async getGraph(): Promise<WikiGraph> {
    try {
      const raw = await fs.readFile(GRAPH_PATH, "utf-8");
      return JSON.parse(raw) as WikiGraph;
    } catch {
      return this.buildGraphFromPages();
    }
  }

  async buildGraphFromPages(): Promise<WikiGraph> {
    const pages = await getWikiPages();
    const slugs = new Set(pages.map((p) => p.slug));
    const nodes = pages.map((p) => ({
      id: p.slug,
      title: p.title,
      type: p.type,
    }));
    const edges: { source: string; target: string }[] = [];
    for (const page of pages) {
      for (const target of page.links) {
        if (slugs.has(target)) {
          edges.push({ source: page.slug, target });
        }
      }
    }
    return { nodes, edges };
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    const limit = options.limit ?? 8;
    const expandHops = options.expandHops ?? 1;
    const includeSources = options.includeSources ?? true;

    const wikiDocs = await this.listPages();
    const fuse = new Fuse(wikiDocs, {
      keys: [
        { name: "title", weight: 0.4 },
        { name: "summary", weight: 0.3 },
        { name: "content", weight: 0.3 },
      ],
      threshold: 0.5,
      ignoreLocation: true,
      includeScore: true,
    });

    const keywords = query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w));
    const searchQuery = keywords.length >= 2 ? keywords.join(" ") : query;

    const hits = fuse.search(searchQuery).slice(0, limit);
    let seeded = hits.map((h) => ({
      ...h.item,
      score: 1 - (h.score ?? 0),
    }));

    if (seeded.length === 0 && keywords.length > 0) {
      seeded = wikiDocs
        .map((doc) => {
          const hay = `${doc.title} ${doc.summary} ${doc.content}`.toLowerCase();
          const matched = keywords.filter((k) => hay.includes(k)).length;
          return { doc, matched };
        })
        .filter((x) => x.matched > 0)
        .sort((a, b) => b.matched - a.matched)
        .slice(0, limit)
        .map((x) => ({ ...x.doc, score: x.matched / keywords.length }));
    }

    const vectorSeeded = await this.vectorSeed(query, wikiDocs, limit);
    if (vectorSeeded.length > 0) {
      const bySlug = new Map(seeded.map((d) => [d.slug, d]));
      for (const v of vectorSeeded) {
        const existing = bySlug.get(v.slug);
        if (existing) {
          existing.score = Math.max(existing.score ?? 0, (v.score ?? 0) * 0.95);
        } else {
          bySlug.set(v.slug, v);
        }
      }
      seeded = [...bySlug.values()]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, limit);
    }

    const expandedFrom = seeded.map((d) => d.slug);
    const graph = await this.getGraph();
    const adjacency = new Map<string, Set<string>>();
    for (const edge of graph.edges) {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
      if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
      adjacency.get(edge.source)!.add(edge.target);
      adjacency.get(edge.target)!.add(edge.source);
    }

    const seen = new Set(seeded.map((d) => d.slug));
    const expanded: KnowledgeDocument[] = [...seeded];

    let frontier = [...expandedFrom];
    for (let hop = 0; hop < expandHops; hop++) {
      const next: string[] = [];
      for (const slug of frontier) {
        for (const neighbor of adjacency.get(slug) ?? []) {
          if (seen.has(neighbor)) continue;
          seen.add(neighbor);
          const page = wikiDocs.find((d) => d.slug === neighbor);
          if (page) {
            expanded.push({ ...page, score: 0.35 / (hop + 1) });
            next.push(neighbor);
          }
        }
      }
      frontier = next;
    }

    if (includeSources) {
      const sourceDocs = await this.getSourceDocuments();
      const sourceFuse = new Fuse(sourceDocs, {
        keys: ["title", "summary", "content"],
        threshold: 0.4,
        includeScore: true,
      });
      for (const hit of sourceFuse.search(query).slice(0, 3)) {
        expanded.push({
          ...hit.item,
          score: (1 - (hit.score ?? 0)) * 0.7,
        });
      }

      // Blend persisted source vectors when available
      const sourceHits = await this.vectorSeedSources(query, sourceDocs, 3);
      for (const s of sourceHits) {
        if (!expanded.some((d) => d.id === s.id)) {
          expanded.push(s);
        }
      }
    }

    expanded.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "wiki" ? -1 : 1;
      return (b.score ?? 0) - (a.score ?? 0);
    });

    return {
      query,
      documents: expanded.slice(0, limit + 4),
      expandedFrom,
    };
  }

  async getChatContext(query: string) {
    const result = await this.search(query, { limit: 6, expandHops: 1, includeSources: true });
    return { query, documents: result.documents };
  }

  async doctor(): Promise<DoctorReport> {
    const pages = await getWikiPages();
    const slugs = new Set(pages.map((p) => p.slug));
    const linkedTo = new Set<string>();
    const missingTargets: { from: string; to: string }[] = [];
    let linkCount = 0;
    const contradictions: { page: string; note: string }[] = [];

    for (const page of pages) {
      for (const target of page.links) {
        linkCount++;
        linkedTo.add(target);
        if (!slugs.has(target)) {
          missingTargets.push({ from: page.slug, to: target });
        }
      }

      if (Array.isArray(page.contradictions)) {
        for (const note of page.contradictions) {
          contradictions.push({ page: page.slug, note: String(note) });
        }
      }
      const evolved = page.content.match(
        /##\s*(?:Views that evolved|Contradictions|Tension notes)\s*\n([\s\S]*?)(?=\n##\s|\n#[^#]|$)/i,
      );
      if (evolved) {
        const bullets = evolved[1]
          .split("\n")
          .map((l) => l.replace(/^[-*]\s*/, "").trim())
          .filter((l) => l.length > 8);
        for (const note of bullets.slice(0, 6)) {
          if (!contradictions.some((c) => c.page === page.slug && c.note === note)) {
            contradictions.push({ page: page.slug, note });
          }
        }
      }
    }

    const orphans = pages
      .filter((p) => p.slug !== "index" && !linkedTo.has(p.slug) && p.links.length === 0)
      .map((p) => p.slug);

    return {
      orphans,
      missingTargets,
      contradictions,
      pageCount: pages.length,
      linkCount,
    };
  }

  /**
   * Query persisted wiki vectors; if the store is empty, embed once and upsert (lazy warm).
   */
  private async vectorSeed(
    query: string,
    wikiDocs: KnowledgeDocument[],
    limit: number,
  ): Promise<(KnowledgeDocument & { score: number })[]> {
    try {
      const q = await llmEmbed([query]);
      if (!q) return [];

      const store = await this.getStore();
      let hits = await store.query(q.embeddings[0], { limit, kind: "wiki" });

      if (hits.length === 0 && wikiDocs.length > 0) {
        // Lazy warm: embed wiki pages into the store once
        const texts = wikiDocs.map(
          (d) => `${d.title}\n${d.summary}\n${d.content.slice(0, 2000)}`,
        );
        const embedded = await llmEmbed(texts);
        if (embedded) {
          const { hashContent } = await import("./vector");
          await store.upsert(
            wikiDocs.map((d, i) => ({
              id: d.id,
              kind: "wiki" as const,
              slug: d.slug,
              model: embedded.model,
              embedding: embedded.embeddings[i],
              contentHash: hashContent(texts[i]),
            })),
          );
          hits = await store.query(q.embeddings[0], { limit, kind: "wiki" });
        }
      }

      const bySlug = new Map(wikiDocs.map((d) => [d.slug, d]));
      return hits
        .map((h) => {
          const doc = bySlug.get(h.slug);
          return doc ? { ...doc, score: h.score } : null;
        })
        .filter((d): d is KnowledgeDocument & { score: number } => d !== null);
    } catch {
      return [];
    }
  }

  private async vectorSeedSources(
    query: string,
    sourceDocs: KnowledgeDocument[],
    limit: number,
  ): Promise<(KnowledgeDocument & { score: number })[]> {
    try {
      const q = await llmEmbed([query]);
      if (!q) return [];
      const store = await this.getStore();
      const hits = await store.query(q.embeddings[0], { limit, kind: "source" });
      const byId = new Map(sourceDocs.map((d) => [d.id, d]));
      return hits
        .map((h) => {
          const doc = byId.get(h.id) ?? sourceDocs.find((d) => d.slug === h.slug);
          return doc ? { ...doc, score: h.score * 0.75 } : null;
        })
        .filter((d): d is KnowledgeDocument & { score: number } => d !== null);
    } catch {
      return [];
    }
  }

  private async getSourceDocuments(): Promise<KnowledgeDocument[]> {
    const entries = await getEntries();
    return entries.map((e) => ({
      id: `source:entries/${e.slug}`,
      title: e.title,
      kind: "source" as const,
      slug: `entries/${e.slug}`,
      summary: e.summary,
      content: e.content,
    }));
  }
}

let provider: KnowledgeProvider | null = null;

export function getKnowledgeProvider(): KnowledgeProvider {
  if (!provider) {
    provider = new WikiKnowledgeProvider();
  }
  return provider;
}

export async function writeWikiGraph(graph: WikiGraph): Promise<void> {
  await fs.writeFile(GRAPH_PATH, JSON.stringify(graph, null, 2), "utf-8");
}
