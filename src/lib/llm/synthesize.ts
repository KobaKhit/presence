import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { llmGenerateText, resolveLlm } from "./provider";
import {
  buildSourceIndex,
  filterSourceRefs,
  isSignificantEntity,
  type SourceIndex,
} from "../content/citations";

export interface SynthesizeOptions {
  /** Blind overwrite existing pages. Default false — prefer incremental merge. */
  force?: boolean;
  /** Max pages to create or incrementally update in one compile. */
  maxPages?: number;
  contentRoot?: string;
  /** Skip incremental updates to existing pages (only create missing). */
  createOnly?: boolean;
}

export interface SynthesizeResult {
  provider: string;
  model: string;
  entities: { slug: string; title: string; type: string }[];
  written: string[];
  updated: string[];
  skipped: string[];
  contradictions: { page: string; notes: string[] }[];
  errors: string[];
  /** Source refs stripped because they were not in the corpus index. */
  strippedSources?: { page: string; sources: string[] }[];
}

interface ExtractedEntity {
  slug: string;
  title: string;
  type: "hub" | "entity" | "concept";
  summary: string;
  sourceRefs: string[];
}

interface IncrementalPayload {
  markdown: string;
  contradictions: string[];
  changed: boolean;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function listMdRecursive(dir: string, prefix = ""): Promise<{ rel: string; abs: string }[]> {
  const out: { rel: string; abs: string }[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) {
      out.push(...(await listMdRecursive(abs, rel)));
    } else if (e.isFile() && e.name.endsWith(".md")) {
      out.push({ rel: rel.replace(/\.md$/, ""), abs });
    }
  }
  return out;
}

async function loadSourceCorpus(sourcesRoot: string): Promise<string> {
  const files = await listMdRecursive(sourcesRoot);
  const chunks: string[] = [];
  for (const f of files.slice(0, 40)) {
    const raw = await fs.readFile(f.abs, "utf-8");
    const { data, content } = matter(raw);
    const title = (data.title as string) || f.rel;
    chunks.push(
      `### SOURCE ${f.rel}\ntitle: ${title}\n${content.slice(0, 3500)}\n`,
    );
  }
  return chunks.join("\n---\n\n");
}

function parseJsonBlock(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : text.trim();
  return JSON.parse(raw);
}

/** Repair LLM output that opens with --- but omits the closing delimiter. */
function repairFrontmatterDelimiters(markdown: string): string {
  const trimmed = markdown.trim();
  if (!trimmed.startsWith("---")) return trimmed;
  const rest = trimmed.slice(3);
  const closeIdx = rest.search(/\n---\s*(?:\n|$)/);
  if (closeIdx !== -1) return trimmed;

  // Insert closing --- before the first markdown heading or blank+heading.
  const heading = rest.match(/\n(#+\s|\*\*)/);
  if (heading?.index != null) {
    const before = rest.slice(0, heading.index).trimEnd();
    const after = rest.slice(heading.index).replace(/^\n+/, "\n\n");
    return `---\n${before}\n---${after}`;
  }
  return `---\n${rest.trim()}\n---\n`;
}

function sanitizeEntitySources(
  entity: ExtractedEntity,
  index: SourceIndex,
  log: { page: string; sources: string[] }[],
): ExtractedEntity {
  const { valid, unknown } = filterSourceRefs(index, entity.sourceRefs);
  if (unknown.length) {
    log.push({ page: entity.slug, sources: unknown });
    console.warn(
      `[synthesize] stripped unknown sources for ${entity.slug}: ${unknown.join(", ")}`,
    );
  }
  return { ...entity, sourceRefs: valid };
}

function ensureFrontmatter(
  markdown: string,
  entity: ExtractedEntity,
  today: string,
  contradictions: string[],
  index: SourceIndex,
  strippedLog: { page: string; sources: string[] }[],
): string {
  let body = repairFrontmatterDelimiters(markdown);
  const safeEntity = sanitizeEntitySources(entity, index, strippedLog);

  if (!body.startsWith("---")) {
    body = `---
title: "${safeEntity.title.replace(/"/g, '\\"')}"
summary: "${(safeEntity.summary || safeEntity.title).replace(/"/g, '\\"')}"
type: ${safeEntity.type}
sources:
${safeEntity.sourceRefs.map((s) => `  - ${s}`).join("\n") || "  []"}
updated: "${today}"
${contradictions.length ? `contradictions:\n${contradictions.map((c) => `  - ${JSON.stringify(c)}`).join("\n")}\n` : ""}---

${body}
`;
    return body.endsWith("\n") ? body : `${body}\n`;
  }

  try {
    const parsed = matter(body);
    parsed.data.title = parsed.data.title ?? safeEntity.title;
    parsed.data.summary = parsed.data.summary ?? safeEntity.summary;
    parsed.data.type = parsed.data.type ?? safeEntity.type;
    parsed.data.updated = today;
    const prevSources = Array.isArray(parsed.data.sources)
      ? (parsed.data.sources as string[])
      : [];
    const merged = filterSourceRefs(index, [...prevSources, ...safeEntity.sourceRefs]);
    if (merged.unknown.length) {
      strippedLog.push({ page: safeEntity.slug, sources: merged.unknown });
      console.warn(
        `[synthesize] stripped unknown sources for ${safeEntity.slug}: ${merged.unknown.join(", ")}`,
      );
    }
    parsed.data.sources = merged.valid;
    if (contradictions.length) {
      const prev = Array.isArray(parsed.data.contradictions)
        ? (parsed.data.contradictions as string[])
        : [];
      parsed.data.contradictions = [...new Set([...prev, ...contradictions])];
    }
    const out = matter.stringify(parsed.content.trimStart(), parsed.data);
    return out.endsWith("\n") ? out : `${out}\n`;
  } catch {
    // Last resort: rebuild frontmatter from entity metadata
    const contentOnly = body.replace(/^---[\s\S]*?\n---\s*/, "").trimStart();
    body = `---
title: "${safeEntity.title.replace(/"/g, '\\"')}"
summary: "${(safeEntity.summary || safeEntity.title).replace(/"/g, '\\"')}"
type: ${safeEntity.type}
sources:
${safeEntity.sourceRefs.map((s) => `  - ${s}`).join("\n") || "  []"}
updated: "${today}"
${contradictions.length ? `contradictions:\n${contradictions.map((c) => `  - ${JSON.stringify(c)}`).join("\n")}\n` : ""}---

${contentOnly || `## Overview\n`}
`;
    return body.endsWith("\n") ? body : `${body}\n`;
  }
}

function knownCitationList(index: SourceIndex): string {
  const prefs = [...index.canonicalBySlug.values()].sort();
  return prefs.slice(0, 80).join(", ") || "(none)";
}

async function generateNewPage(
  entity: ExtractedEntity,
  corpus: string,
  existingSlugs: string[],
  index: SourceIndex,
): Promise<string | null> {
  const allowed = knownCitationList(index);
  const page = await llmGenerateText({
    system: `Write one dense wiki page in markdown for a personal LLM Wiki.
Rules:
- Start with YAML frontmatter: title, summary, type, sources (list), updated (YYYY-MM-DD)
- Body: do NOT start with a duplicate H1 matching the title — the site header already shows the title. Start sections at H2 (##).
- 2–4 short sections, dense [[wiki-links]] to related concepts using kebab-case slugs
- Frame the page around what the author did with / how they used this topic — not a Wikipedia-style generic definition
- sources: ONLY cite paths from entity.sourceRefs / this allowlist: ${allowed}
- Never invent blog/, projects/, or visuals/ paths that are not in the allowlist
- "## Views that evolved" ONLY for real disagreements between real cited sources — never invent career narratives from unrelated posts
- No code fences around the whole document`,
    prompt: `Entity: ${JSON.stringify(entity)}

Existing wiki slugs for linking: ${existingSlugs.join(", ")}

Corpus excerpt:
${corpus.slice(0, 40000)}`,
    temperature: 0.35,
  });
  return page?.text.trim() ?? null;
}

async function incrementalUpdatePage(
  entity: ExtractedEntity,
  existingMarkdown: string,
  corpus: string,
  existingSlugs: string[],
  index: SourceIndex,
): Promise<IncrementalPayload | null> {
  const allowed = knownCitationList(index);
  const result = await llmGenerateText({
    system: `You maintain an existing LLM Wiki page. Sources are immutable; update the wiki incrementally.
Return ONLY JSON:
{
  "changed": boolean,
  "contradictions": string[],  // short notes when sources disagree with each other or the current page
  "markdown": string           // full page markdown WITH YAML frontmatter when changed is true; else ""
}
Rules for markdown when changed:
- Preserve stable [[wiki-links]] and structure where possible; merge new facts from sources
- Keep frontmatter fields: title, summary, type, sources, updated, contradictions (if any)
- Body must NOT open with a duplicate H1 matching title — sections start at H2
- Frame updates around the author's work with this topic, not generic encyclopedia prose
- Add or refresh "## Views that evolved" ONLY when real cited sources disagree — never invent narratives
- sources: ONLY paths from entity.sourceRefs / allowlist: ${allowed}
- Do not invent blog/project/visual paths; do not invent facts`,
    prompt: `Entity: ${JSON.stringify(entity)}

Current page:
${existingMarkdown.slice(0, 12000)}

Existing wiki slugs: ${existingSlugs.join(", ")}

Corpus excerpt (authoritative):
${corpus.slice(0, 35000)}`,
    temperature: 0.25,
  });

  if (!result) return null;

  try {
    const parsed = parseJsonBlock(result.text) as {
      changed?: boolean;
      contradictions?: string[];
      markdown?: string;
    };
    const contradictions = Array.isArray(parsed.contradictions)
      ? parsed.contradictions.map(String).filter(Boolean)
      : [];
    return {
      changed: Boolean(parsed.changed),
      contradictions,
      markdown: typeof parsed.markdown === "string" ? parsed.markdown.trim() : "",
    };
  } catch {
    // Fallback: treat raw text as full page if it looks like markdown
    const text = result.text.trim();
    if (text.startsWith("---") || text.startsWith("#")) {
      return { changed: true, contradictions: [], markdown: text };
    }
    return null;
  }
}

/**
 * Entity extraction → wiki page generation / incremental update when an LLM key is available.
 * Never edits content/sources. Writes only under content/wiki.
 */
export async function synthesizeWikiFromSources(
  options: SynthesizeOptions = {},
): Promise<SynthesizeResult | null> {
  const llm = resolveLlm();
  if (!llm) return null;

  const contentRoot = options.contentRoot ?? path.join(process.cwd(), "content");
  const sourcesRoot = path.join(contentRoot, "sources");
  const wikiRoot = path.join(contentRoot, "wiki");
  const maxPages = options.maxPages ?? 8;
  const force = options.force ?? false;
  const createOnly = options.createOnly ?? false;

  const result: SynthesizeResult = {
    provider: llm.provider,
    model: llm.chatModel,
    entities: [],
    written: [],
    updated: [],
    skipped: [],
    contradictions: [],
    errors: [],
    strippedSources: [],
  };

  const sourceIndex = await buildSourceIndex(contentRoot);
  const strippedLog = result.strippedSources!;

  const corpus = await loadSourceCorpus(sourcesRoot);
  if (!corpus.trim()) {
    result.errors.push("No sources found under content/sources");
    return result;
  }

  let existing: string[] = [];
  try {
    existing = (await fs.readdir(wikiRoot))
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""));
  } catch {
    await fs.mkdir(wikiRoot, { recursive: true });
  }

  const allowed = knownCitationList(sourceIndex);
  const extract = await llmGenerateText({
    system: `You maintain an LLM Wiki for a personal site. Sources are immutable.
Extract the most important entities/concepts that deserve dedicated wiki pages.
Return ONLY JSON: { "entities": [ { "slug": "kebab-case", "title": "...", "type": "concept"|"entity"|"hub", "summary": "one sentence about the author's relationship to this topic", "sourceRefs": ["blog/slug-or-projects/slug"] } ] }

Significance rules (STRICT):
- Only include entities mentioned in ≥2 distinct sources, OR clearly tied to the site owner's own work (a real project/post/visual), OR identity/career hubs
- Skip noise naming-convention / trivia entities (e.g. "Kebab Case") unless ≥2 sources AND tied to the author's work
- Prefer framing "what the author did with X" over Wikipedia-style generic definitions
- sourceRefs: ONLY cite paths from this allowlist: ${allowed}
- Never invent blog/, projects/, or visuals/ paths

Prefer 4–${maxPages} high-value entities. Reuse existing slugs when they match: ${existing.join(", ") || "(none)"}.
Also include entities that may need contradiction review when sources span years.`,
    prompt: `Corpus:\n\n${corpus.slice(0, 60000)}`,
    temperature: 0.2,
  });

  if (!extract) {
    result.errors.push("LLM generateText returned null");
    return result;
  }

  let entities: ExtractedEntity[] = [];
  try {
    const parsed = parseJsonBlock(extract.text) as { entities?: ExtractedEntity[] };
    entities = (parsed.entities ?? [])
      .map((e) => {
        const type: ExtractedEntity["type"] =
          e.type === "hub" || e.type === "entity" ? e.type : "concept";
        const { valid, unknown } = filterSourceRefs(
          sourceIndex,
          Array.isArray(e.sourceRefs) ? e.sourceRefs : [],
        );
        if (unknown.length) {
          strippedLog.push({ page: slugify(e.slug || e.title), sources: unknown });
          console.warn(
            `[synthesize] dropped invented sourceRefs for ${e.slug || e.title}: ${unknown.join(", ")}`,
          );
        }
        return {
          ...e,
          slug: slugify(e.slug || e.title),
          type,
          sourceRefs: valid,
        };
      })
      .filter((e) => e.slug && e.title)
      .filter((e) => {
        if (isSignificantEntity(e, sourceIndex)) return true;
        console.warn(
          `[synthesize] skipped insignificant entity: ${e.slug} (${e.sourceRefs.length} valid sourceRefs)`,
        );
        return false;
      })
      .slice(0, maxPages);
  } catch (err) {
    result.errors.push(
      `Failed to parse entity JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
    return result;
  }

  result.entities = entities.map((e) => ({
    slug: e.slug,
    title: e.title,
    type: e.type,
  }));

  const today = new Date().toISOString().slice(0, 10);
  const linkSlugs = [...new Set([...existing, ...entities.map((e) => e.slug)])];

  for (const entity of entities) {
    const file = path.join(wikiRoot, `${entity.slug}.md`);
    const exists = existing.includes(entity.slug);
    const safeEntity = sanitizeEntitySources(entity, sourceIndex, strippedLog);

    try {
      if (!exists || force) {
        const markdown = await generateNewPage(safeEntity, corpus, linkSlugs, sourceIndex);
        if (!markdown) {
          result.errors.push(`No text for ${safeEntity.slug}`);
          continue;
        }
        const finalMd = ensureFrontmatter(
          markdown,
          safeEntity,
          today,
          [],
          sourceIndex,
          strippedLog,
        );
        await fs.writeFile(file, finalMd, "utf-8");
        result.written.push(safeEntity.slug);
        if (!existing.includes(safeEntity.slug)) existing.push(safeEntity.slug);
        continue;
      }

      if (createOnly) {
        result.skipped.push(safeEntity.slug);
        continue;
      }

      // Incremental merge for existing pages
      const current = await fs.readFile(file, "utf-8");
      const inc = await incrementalUpdatePage(
        safeEntity,
        current,
        corpus,
        linkSlugs,
        sourceIndex,
      );
      if (!inc) {
        result.errors.push(`Incremental update failed for ${safeEntity.slug}`);
        result.skipped.push(safeEntity.slug);
        continue;
      }

      if (inc.contradictions.length) {
        result.contradictions.push({ page: safeEntity.slug, notes: inc.contradictions });
      }

      if (!inc.changed && inc.contradictions.length === 0) {
        result.skipped.push(safeEntity.slug);
        continue;
      }

      if (inc.changed && inc.markdown) {
        const finalMd = ensureFrontmatter(
          inc.markdown,
          safeEntity,
          today,
          inc.contradictions,
          sourceIndex,
          strippedLog,
        );
        await fs.writeFile(file, finalMd, "utf-8");
        result.updated.push(safeEntity.slug);
      } else if (inc.contradictions.length) {
        // Only contradictions changed — patch frontmatter / section on existing page
        const finalMd = ensureFrontmatter(
          current,
          safeEntity,
          today,
          inc.contradictions,
          sourceIndex,
          strippedLog,
        );
        const withSection = appendEvolvedSection(finalMd, inc.contradictions);
        await fs.writeFile(file, withSection, "utf-8");
        result.updated.push(safeEntity.slug);
      } else {
        result.skipped.push(safeEntity.slug);
      }
    } catch (err) {
      result.errors.push(
        `${safeEntity.slug}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return result;
}

function appendEvolvedSection(markdown: string, notes: string[]): string {
  if (!notes.length) return markdown;
  if (/##\s*Views that evolved/i.test(markdown)) {
    return markdown;
  }
  const section = `\n## Views that evolved\n\n${notes.map((n) => `- ${n}`).join("\n")}\n`;
  return markdown.endsWith("\n") ? `${markdown}${section}` : `${markdown}\n${section}`;
}

/**
 * Walk existing wiki pages and strip unknown `sources:` citations from disk.
 * Used by compile/doctor so fabricated refs do not linger.
 */
export async function sanitizeWikiSourceCitations(
  contentRoot = path.join(process.cwd(), "content"),
): Promise<{ page: string; stripped: string[] }[]> {
  const wikiRoot = path.join(contentRoot, "wiki");
  const index = await buildSourceIndex(contentRoot);
  const changes: { page: string; stripped: string[] }[] = [];

  let files: string[];
  try {
    files = (await fs.readdir(wikiRoot)).filter((f) => f.endsWith(".md"));
  } catch {
    return changes;
  }

  for (const file of files) {
    const abs = path.join(wikiRoot, file);
    const raw = await fs.readFile(abs, "utf-8");
    let parsed;
    try {
      parsed = matter(raw);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed.data.sources)) continue;
    const { valid, unknown } = filterSourceRefs(index, parsed.data.sources as string[]);
    if (!unknown.length) continue;
    parsed.data.sources = valid;
    const out = matter.stringify(parsed.content.trimStart(), parsed.data);
    await fs.writeFile(abs, out.endsWith("\n") ? out : `${out}\n`, "utf-8");
    changes.push({ page: file.replace(/\.md$/, ""), stripped: unknown });
    console.warn(
      `[citations] stripped unknown sources on ${file}: ${unknown.join(", ")}`,
    );
  }

  return changes;
}
