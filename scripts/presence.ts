#!/usr/bin/env node
/**
 * Presence CLI — compile · doctor · reindex · ingest
 * Usage: npx tsx scripts/presence.ts <command>
 */
import fs from "fs/promises";
import path from "path";
import { Command } from "commander";
import matter from "gray-matter";
import { loadPresenceEnv } from "../src/lib/llm/env";
import {
  describeLlmForHumans,
  getLlmStatus,
  sanitizeWikiSourceCitations,
  synthesizeWikiFromSources,
} from "../src/lib/llm";
import { reindexEmbeddings } from "../src/lib/knowledge/reindex";
import {
  buildSourceIndex,
  findUnknownCitations,
} from "../src/lib/content/citations";
import { extractWikiLinks as extractWikiLinksShared } from "../src/lib/content/markdown";

loadPresenceEnv();

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const WIKI = path.join(CONTENT, "wiki");
const SOURCES = path.join(CONTENT, "sources");
const GRAPH = path.join(CONTENT, "wiki-graph.json");

function extractWikiLinks(content: string): string[] {
  return extractWikiLinksShared(content);
}

async function listMd(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => e.name);
  } catch {
    return [];
  }
}

async function loadWikiPages() {
  const files = await listMd(WIKI);
  const pages = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(WIKI, file), "utf-8");
    const { data, content } = matter(raw);
    const slug = file.replace(/\.md$/, "");
    pages.push({
      slug,
      title: (data.title as string) ?? slug,
      type: (data.type as string) ?? "concept",
      links: extractWikiLinks(content),
      content,
      sources: Array.isArray(data.sources) ? (data.sources as string[]) : [],
      contradictions: Array.isArray(data.contradictions)
        ? (data.contradictions as string[])
        : [],
    });
  }
  return pages;
}

async function buildGraph() {
  const pages = await loadWikiPages();
  const slugs = new Set(pages.map((p) => p.slug));
  const nodes = pages.map((p) => ({ id: p.slug, title: p.title, type: p.type }));
  const edges: { source: string; target: string }[] = [];
  for (const page of pages) {
    for (const target of page.links) {
      if (slugs.has(target)) edges.push({ source: page.slug, target });
    }
  }
  return { nodes, edges, pages };
}

function collectContradictionNotes(
  pages: Awaited<ReturnType<typeof loadWikiPages>>,
): { page: string; note: string }[] {
  const out: { page: string; note: string }[] = [];
  for (const page of pages) {
    for (const note of page.contradictions) {
      out.push({ page: page.slug, note });
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
        if (!out.some((c) => c.page === page.slug && c.note === note)) {
          out.push({ page: page.slug, note });
        }
      }
    }
  }
  return out;
}

async function doctor() {
  const status = getLlmStatus();
  console.log(`LLM: ${describeLlmForHumans()}`);
  if (status.configured) {
    console.log(`  provider=${status.provider} chat=${status.chatModel} embed=${status.embeddingModel}`);
  }

  const { pages, edges } = await buildGraph();
  const slugs = new Set(pages.map((p) => p.slug));
  const linkedTo = new Set(edges.map((e) => e.target));
  const missing: { from: string; to: string }[] = [];
  let linkCount = 0;
  for (const page of pages) {
    for (const target of page.links) {
      linkCount++;
      if (!slugs.has(target)) missing.push({ from: page.slug, to: target });
    }
  }
  const orphans = pages
    .filter((p) => p.slug !== "index" && !linkedTo.has(p.slug) && p.links.length === 0)
    .map((p) => p.slug);
  const contradictions = collectContradictionNotes(pages);

  const sourceIndex = await buildSourceIndex(CONTENT);
  const unknownCitations = findUnknownCitations(pages, sourceIndex);

  console.log(`Pages: ${pages.length}`);
  console.log(`Links: ${linkCount}`);
  console.log(`Orphans: ${orphans.length ? orphans.join(", ") : "(none)"}`);
  console.log(
    `Missing targets: ${missing.length ? missing.map((m) => `${m.from}→${m.to}`).join(", ") : "(none)"}`,
  );
  console.log(
    `Unknown citations: ${
      unknownCitations.length
        ? unknownCitations.map((c) => `${c.page}→${c.source}`).join(", ")
        : "(none)"
    }`,
  );
  if (unknownCitations.length) {
    console.error(
      `ERROR: ${unknownCitations.length} unknown source citation(s) — run compile to strip, or fix wiki frontmatter.`,
    );
  }
  console.log(
    `Contradictions: ${
      contradictions.length
        ? contradictions.map((c) => `${c.page}: ${c.note.slice(0, 80)}`).join(" | ")
        : "(none)"
    }`,
  );
  return {
    pageCount: pages.length,
    linkCount,
    orphans,
    missingTargets: missing,
    unknownCitations,
    contradictions,
  };
}

async function writeGraphIndex() {
  const { nodes, edges, pages } = await buildGraph();
  await fs.writeFile(GRAPH, JSON.stringify({ nodes, edges }, null, 2), "utf-8");
  console.log(`Wrote ${GRAPH}`);
  console.log(`${nodes.length} nodes, ${edges.length} edges`);
  return pages;
}

async function compile(opts: {
  llm?: boolean;
  force?: boolean;
  maxPages?: string;
  createOnly?: boolean;
  reindex?: boolean;
}) {
  console.log("Compiling wiki …");

  // Count flat .md + folder index.md under sources/entries
  let entryCount = 0;
  try {
    const names = await fs.readdir(path.join(SOURCES, "entries"), { withFileTypes: true });
    for (const n of names) {
      if (n.isFile() && n.name.endsWith(".md")) entryCount += 1;
      else if (n.isDirectory()) {
        try {
          await fs.access(path.join(SOURCES, "entries", n.name, "index.md"));
          entryCount += 1;
        } catch {
          try {
            await fs.access(path.join(SOURCES, "entries", n.name, "index.html"));
            entryCount += 1;
          } catch {
            /* empty folder */
          }
        }
      }
    }
  } catch {
    /* no entries dir */
  }
  console.log(`Sources: ${entryCount} entries under sources/entries/`);

  const status = getLlmStatus();
  const wantLlm = opts.llm !== false && status.configured;

  if (wantLlm) {
    console.log(`LLM synthesis via ${status.provider} (${status.chatModel}) …`);
    const synth = await synthesizeWikiFromSources({
      force: Boolean(opts.force),
      createOnly: Boolean(opts.createOnly),
      maxPages: opts.maxPages ? Number(opts.maxPages) : 8,
      contentRoot: CONTENT,
    });
    if (synth) {
      console.log(
        `Entities: ${synth.entities.map((e) => e.slug).join(", ") || "(none)"}`,
      );
      console.log(`Written (new): ${synth.written.length ? synth.written.join(", ") : "(none)"}`);
      console.log(
        `Updated (incremental): ${synth.updated.length ? synth.updated.join(", ") : "(none)"}`,
      );
      console.log(`Skipped: ${synth.skipped.length ? synth.skipped.join(", ") : "(none)"}`);
      if (synth.contradictions.length) {
        console.log(
          `Contradictions flagged: ${synth.contradictions
            .map((c) => `${c.page} (${c.notes.length})`)
            .join(", ")}`,
        );
      }
      if (synth.errors.length) {
        console.log(`Errors: ${synth.errors.join("; ")}`);
      }
    }
  } else if (status.configured && opts.llm === false) {
    console.log("Skipping LLM synthesis (--no-llm).");
  } else {
    console.log(
      "No OPENROUTER_API_KEY / OPENAI_API_KEY — graph-only compile (zero-config).",
    );
  }

  const scrubbed = await sanitizeWikiSourceCitations(CONTENT);
  if (scrubbed.length) {
    console.log(
      `Stripped unknown citations on: ${scrubbed.map((s) => `${s.page}(${s.stripped.length})`).join(", ")}`,
    );
  }

  const pages = await writeGraphIndex();
  await doctor();

  if (opts.reindex !== false) {
    console.log("Refreshing vector index …");
    const idx = await reindexEmbeddings();
    console.log(
      `Vectors (${idx.backend}): upserted=${idx.upserted} skipped=${idx.skipped} deleted=${idx.deleted} total=${idx.total}`,
    );
    if (idx.errors.length) console.log(`Vector notes: ${idx.errors.join("; ")}`);
  }

  console.log(`Compile complete. ${pages.length} wiki pages ready.`);
}

async function reindex() {
  await writeGraphIndex();
  console.log("Refreshing persistent embeddings …");
  const idx = await reindexEmbeddings();
  console.log(
    `Vectors (${idx.backend}): upserted=${idx.upserted} skipped=${idx.skipped} deleted=${idx.deleted} total=${idx.total}`,
  );
  if (idx.errors.length) console.log(`Notes: ${idx.errors.join("; ")}`);
  if (!idx.provider) {
    console.log(
      "Set OPENROUTER_API_KEY (preferred) or OPENAI_API_KEY to populate embeddings.",
    );
  }
}

async function ingest(target: string) {
  const destDir = path.join(SOURCES, "inbox");
  await fs.mkdir(destDir, { recursive: true });
  const base = path.basename(target).replace(/\?.*$/, "") || `ingest-${Date.now()}.md`;
  const dest = path.join(destDir, base.endsWith(".md") ? base : `${base}.md`);

  if (target.startsWith("http://") || target.startsWith("https://")) {
    const res = await fetch(target);
    const text = await res.text();
    await fs.writeFile(
      dest,
      `---\ntitle: "Ingested"\nsource: "${target}"\ndate: "${new Date().toISOString().slice(0, 10)}"\n---\n\n${text.slice(0, 50000)}\n`,
      "utf-8",
    );
    console.log(`Saved remote ingest → ${dest}`);
  } else {
    const raw = await fs.readFile(target, "utf-8");
    await fs.writeFile(dest, raw, "utf-8");
    console.log(`Copied → ${dest}`);
  }
  console.log("Move curated files into sources/entries/ (type: post|project|visual), then run compile.");
}

const program = new Command();
program.name("presence").description("Presence knowledge CLI").version("0.1.0");
program
  .command("compile")
  .description("Build wiki pages (LLM when keyed) + link graph + vector reindex")
  .option("--no-llm", "Skip LLM entity extraction / page synthesis")
  .option("--force", "Blind overwrite existing wiki pages (skip incremental merge)")
  .option("--create-only", "Only create missing pages; do not incrementally update")
  .option("--no-reindex", "Skip embedding vector store refresh")
  .option("--max-pages <n>", "Max pages to synthesize/update", "8")
  .action(async (opts) => {
    await compile({
      llm: opts.llm,
      force: opts.force,
      createOnly: opts.createOnly,
      reindex: opts.reindex,
      maxPages: opts.maxPages,
    });
  });
program
  .command("doctor")
  .description("Report orphans, missing links, unknown citations, contradictions, LLM status")
  .action(async () => {
    await doctor();
  });
program
  .command("reindex")
  .description("Rebuild graph index + persist embeddings (SQLite / pgvector)")
  .action(reindex);
program
  .command("ingest")
  .argument("<url-or-file>")
  .description("Ingest a URL or file into content/sources/inbox")
  .action(ingest);

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
