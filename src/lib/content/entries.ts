import fs from "fs/promises";
import path from "path";
import { parseMarkdown } from "./markdown";

const CONTENT_ROOT = path.join(process.cwd(), "content");
export const ENTRIES_DIR = path.join(CONTENT_ROOT, "sources", "entries");

/** Content type used for tabs / routes / API filtering */
export type EntryType = "post" | "project" | "visual";

export interface EntryFrontmatter {
  title?: string;
  date?: string;
  summary?: string;
  tags?: string[];
  draft?: boolean;
  /** post = blog, project = portfolio, visual = data visual */
  type?: EntryType;
  /** @deprecated use type — kept for migration */
  kind?: "project" | "visual";
  url?: string;
  github?: string;
  pdf?: string;
  status?: "active" | "archived" | "wip";
  /**
   * Path to HTML entrypoint.
   * - Absolute public path: `/data-visuals/...`
   * - Relative to entry folder: `nba_3pt_spiral.html` → served at `/entries/{slug}/nba_3pt_spiral.html`
   * - Omit for folder entries with `index.html` (auto-detected)
   */
  visualPath?: string;
  image?: string;
  featured?: boolean;
}

export interface Entry {
  slug: string;
  type: EntryType;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  url?: string;
  github?: string;
  pdf?: string;
  status: "active" | "archived" | "wip";
  visualPath?: string;
  image?: string;
  featured: boolean;
  content: string;
  html: string;
  /** Absolute path to entry directory (undefined for flat single files) */
  dir?: string;
  /** Relative source ref for wiki compile, e.g. entries/nba-3pt-spiral */
  sourceRef: string;
}

function resolveType(fm: EntryFrontmatter, fallback: EntryType = "project"): EntryType {
  if (fm.type === "post" || fm.type === "project" || fm.type === "visual") return fm.type;
  if (fm.kind === "visual") return "visual";
  if (fm.kind === "project") return "project";
  return fallback;
}

function titleFromSlug(slug: string): string {
  return slug
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function parseEntryFile(
  filePath: string,
  slug: string,
  dir?: string,
): Promise<Entry | null> {
  const ext = path.extname(filePath).toLowerCase();
  const raw = await fs.readFile(filePath, "utf-8");

  if (ext === ".html" || ext === ".htm") {
    // Optional YAML frontmatter in HTML comments is not required —
    // treat whole file as HTML body; title from slug unless <!-- title: ... -->
    const titleMatch = raw.match(/<!--\s*title:\s*(.+?)\s*-->/i);
    const typeMatch = raw.match(/<!--\s*type:\s*(post|project|visual)\s*-->/i);
    const type = (typeMatch?.[1] as EntryType) ?? "visual";
    const visualPath = dir
      ? `/entries/${slug}/${path.basename(filePath)}`
      : undefined;
    return {
      slug,
      type,
      title: titleMatch?.[1]?.trim() ?? titleFromSlug(slug),
      date: "",
      summary: "",
      tags: [],
      status: "active",
      visualPath,
      featured: false,
      content: "",
      html: raw,
      dir,
      sourceRef: `entries/${slug}`,
    };
  }

  const parsed = await parseMarkdown<EntryFrontmatter>(raw, slug);
  const fm = parsed.frontmatter;
  if (fm.draft) return null;

  const type = resolveType(fm);
  let visualPath = fm.visualPath;

  if (dir) {
    // Relative visualPath → public URL under /entries/{slug}/
    if (visualPath && !visualPath.startsWith("/") && !visualPath.startsWith("http")) {
      visualPath = `/entries/${slug}/${visualPath.replace(/^\.\//, "")}`;
    }
    // Auto-detect index.html when type is visual and no visualPath set
    if (type === "visual" && !visualPath) {
      const indexHtml = path.join(dir, "index.html");
      if (await fileExists(indexHtml)) {
        visualPath = `/entries/${slug}/index.html`;
      }
    }
  }

  return {
    slug,
    type,
    title: fm.title ?? titleFromSlug(slug),
    date: fm.date ?? "",
    summary: fm.summary ?? "",
    tags: fm.tags ?? [],
    url: fm.url,
    github: fm.github,
    pdf: fm.pdf,
    status: fm.status ?? (type === "post" ? "active" : "archived"),
    visualPath,
    image: fm.image,
    featured: fm.featured ?? false,
    content: parsed.content,
    html: parsed.html,
    dir,
    sourceRef: `entries/${slug}`,
  };
}

/**
 * Discover entries under content/sources/entries:
 * - `slug.md` / `slug.html` — single-file entries
 * - `slug/index.md` or `slug/index.html` — folder entries (sibling assets allowed)
 */
export async function getEntries(filter?: {
  type?: EntryType | EntryType[];
}): Promise<Entry[]> {
  let names: string[];
  try {
    names = await fs.readdir(ENTRIES_DIR);
  } catch {
    return [];
  }

  const entries: Entry[] = [];

  for (const name of names) {
    if (name.startsWith(".")) continue;
    const full = path.join(ENTRIES_DIR, name);
    const stat = await fs.stat(full);

    if (stat.isFile()) {
      if (!/\.(md|html?)$/i.test(name)) continue;
      const slug = name.replace(/\.(md|html?)$/i, "");
      const entry = await parseEntryFile(full, slug);
      if (entry) entries.push(entry);
      continue;
    }

    if (stat.isDirectory()) {
      const slug = name;
      const indexMd = path.join(full, "index.md");
      const indexHtml = path.join(full, "index.html");
      let entry: Entry | null = null;
      if (await fileExists(indexMd)) {
        entry = await parseEntryFile(indexMd, slug, full);
      } else if (await fileExists(indexHtml)) {
        entry = await parseEntryFile(indexHtml, slug, full);
      }
      if (entry) entries.push(entry);
    }
  }

  let result = entries;
  if (filter?.type) {
    const types = Array.isArray(filter.type) ? filter.type : [filter.type];
    result = result.filter((e) => types.includes(e.type));
  }

  return result.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getEntry(slug: string): Promise<Entry | null> {
  const all = await getEntries();
  return all.find((e) => e.slug === slug) ?? null;
}

/** Absolute path to an asset inside an entry folder (path traversal safe). */
export function resolveEntryAsset(
  entryDir: string,
  assetPath: string,
): string | null {
  const cleaned = assetPath.replace(/^\/+/, "").replace(/\\/g, "/");
  if (cleaned.includes("..")) return null;
  const abs = path.resolve(entryDir, cleaned);
  if (!abs.startsWith(path.resolve(entryDir))) return null;
  return abs;
}
