import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

export type EntrySourceType = "post" | "project" | "visual";

export interface SourceIndex {
  /** All accepted citation strings (normalized). */
  refs: Set<string>;
  /** entry slug → preferred public citation (blog/…, projects/…, visuals/…) */
  canonicalBySlug: Map<string, string>;
}

export interface CitationFilterResult {
  valid: string[];
  unknown: string[];
}

function normalizeRef(ref: string): string {
  return ref.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.md$/i, "");
}

function routePrefix(type: EntrySourceType): string {
  if (type === "post") return "blog";
  if (type === "visual") return "visuals";
  return "projects";
}

function resolveEntryType(data: Record<string, unknown>): EntrySourceType {
  const t = data.type;
  if (t === "post" || t === "project" || t === "visual") return t;
  if (data.kind === "visual") return "visual";
  if (data.kind === "project") return "project";
  return "project";
}

function addRefAliases(refs: Set<string>, ...aliases: string[]) {
  for (const a of aliases) {
    const n = normalizeRef(a);
    if (!n) continue;
    refs.add(n.toLowerCase());
    refs.add(n); // keep case-insensitive lookup via lowercase; store both
  }
}

/**
 * Build an index of citable source paths from content/sources.
 * Accepts wiki conventions: blog/foo, projects/foo, visuals/foo, entries/foo,
 * bare entry slugs, and top-level files like resume / resume.md.
 */
export async function buildSourceIndex(
  contentRoot = path.join(process.cwd(), "content"),
): Promise<SourceIndex> {
  const refs = new Set<string>();
  const canonicalBySlug = new Map<string, string>();
  const sourcesRoot = path.join(contentRoot, "sources");
  const entriesRoot = path.join(sourcesRoot, "entries");

  // Top-level source files (e.g. resume.md)
  try {
    const top = await fs.readdir(sourcesRoot, { withFileTypes: true });
    for (const e of top) {
      if (!e.isFile()) continue;
      if (!/\.(md|html?)$/i.test(e.name)) continue;
      const base = e.name.replace(/\.(md|html?)$/i, "");
      addRefAliases(refs, base, e.name, `sources/${base}`, `sources/${e.name}`);
      canonicalBySlug.set(base, base);
    }
  } catch {
    /* no sources dir */
  }

  // entries/ — flat files + folder index.md|html
  try {
    const names = await fs.readdir(entriesRoot, { withFileTypes: true });
    for (const name of names) {
      if (name.name.startsWith(".")) continue;
      const full = path.join(entriesRoot, name.name);
      let slug: string;
      let type: EntrySourceType = "project";
      let frontmatterPath: string | null = null;

      if (name.isFile() && /\.(md|html?)$/i.test(name.name)) {
        slug = name.name.replace(/\.(md|html?)$/i, "");
        frontmatterPath = full;
      } else if (name.isDirectory()) {
        slug = name.name;
        const md = path.join(full, "index.md");
        const html = path.join(full, "index.html");
        try {
          await fs.access(md);
          frontmatterPath = md;
        } catch {
          try {
            await fs.access(html);
            frontmatterPath = html;
          } catch {
            continue;
          }
        }
      } else {
        continue;
      }

      if (frontmatterPath?.endsWith(".md")) {
        try {
          const raw = await fs.readFile(frontmatterPath, "utf-8");
          const { data } = matter(raw);
          type = resolveEntryType(data as Record<string, unknown>);
        } catch {
          /* keep default */
        }
      } else if (frontmatterPath?.endsWith(".html") || frontmatterPath?.endsWith(".htm")) {
        try {
          const raw = await fs.readFile(frontmatterPath, "utf-8");
          const typeMatch = raw.match(/<!--\s*type:\s*(post|project|visual)\s*-->/i);
          if (typeMatch) type = typeMatch[1] as EntrySourceType;
        } catch {
          /* keep default */
        }
      }

      const prefix = routePrefix(type);
      const canonical = `${prefix}/${slug}`;
      canonicalBySlug.set(slug, canonical);
      addRefAliases(
        refs,
        canonical,
        `entries/${slug}`,
        slug,
        `${prefix}/${slug}.md`,
        `entries/${slug}.md`,
      );
    }
  } catch {
    /* no entries dir */
  }

  // Normalized lowercase set for lookup
  const normalized = new Set<string>();
  for (const r of refs) normalized.add(normalizeRef(r).toLowerCase());

  return { refs: normalized, canonicalBySlug };
}

export function isKnownSource(index: SourceIndex, ref: string): boolean {
  return filterSourceRefs(index, [ref]).valid.length > 0;
}

/** Filter citation list; returns valid (deduped, canonical form when known) + unknown. */
export function filterSourceRefs(
  index: SourceIndex,
  refs: string[],
): CitationFilterResult {
  const valid: string[] = [];
  const unknown: string[] = [];
  const seen = new Set<string>();

  for (const raw of refs) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    const n = normalizeRef(raw).toLowerCase();
    if (!n) continue;

    let canonical: string | undefined;

    if (index.refs.has(n)) {
      const slug =
        n.replace(/^(blog|projects|visuals|entries|sources)\//, "") || n;
      canonical = index.canonicalBySlug.get(slug) ?? normalizeRef(raw);
    } else {
      // Wrong route prefix but real entry slug → coerce to canonical
      const slug = n.replace(/^(blog|projects|visuals|entries|sources)\//, "");
      if (slug && index.canonicalBySlug.has(slug)) {
        canonical = index.canonicalBySlug.get(slug);
      }
    }

    if (!canonical) {
      unknown.push(raw.trim());
      continue;
    }

    const key = normalizeRef(canonical).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push(canonical);
  }

  return { valid, unknown };
}

export interface WikiCitationIssue {
  page: string;
  source: string;
}

/** Scan wiki page frontmatter sources against the index. */
export function findUnknownCitations(
  pages: { slug: string; sources: string[] }[],
  index: SourceIndex,
): WikiCitationIssue[] {
  const issues: WikiCitationIssue[] = [];
  for (const page of pages) {
    for (const src of page.sources) {
      if (!isKnownSource(index, src)) {
        issues.push({ page: page.slug, source: src });
      }
    }
  }
  return issues;
}

/**
 * Entity significance: ≥2 distinct source mentions, hub/career-identity special case,
 * or slug matching a real entry (author's own work).
 */
export function isSignificantEntity(
  entity: {
    slug: string;
    title: string;
    type: string;
    sourceRefs: string[];
  },
  index: SourceIndex,
): boolean {
  const slug = entity.slug.toLowerCase();
  const title = entity.title.toLowerCase();

  if (entity.type === "hub") return true;
  if (
    /^(index|about|identity|bio|resume)$/i.test(slug) ||
    /career|identity|about me|biography/i.test(slug) ||
    /career|identity|about me|biography/i.test(title)
  ) {
    return true;
  }

  const { valid } = filterSourceRefs(index, entity.sourceRefs);
  const distinct = new Set(valid.map((v) => normalizeRef(v).toLowerCase()));
  if (distinct.size >= 2) return true;

  // Single real source that is the author's own entry matching this entity
  if (distinct.size >= 1 && index.canonicalBySlug.has(slug)) return true;

  return false;
}
