import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import {
  extractWikiLinks,
  parseMarkdown,
  renderWikiLinks,
  stripDuplicateTitleH1,
} from "./markdown";
import { getEntries, getEntry, type Entry } from "./entries";

const CONTENT_ROOT = path.join(process.cwd(), "content");

export type { Entry, EntryType, EntryFrontmatter } from "./entries";
export { getEntries, getEntry, ENTRIES_DIR, resolveEntryAsset } from "./entries";

export interface WikiFrontmatter {
  title: string;
  summary?: string;
  type?: "hub" | "entity" | "concept";
  sources?: string[];
  updated?: string;
  contradictions?: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  content: string;
  html: string;
}

export interface Project {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  url?: string;
  github?: string;
  pdf?: string;
  status: "active" | "archived" | "wip";
  /** Derived from entry.type — "visual" | "project" */
  kind: "project" | "visual";
  visualPath?: string;
  image?: string;
  featured: boolean;
  content: string;
  html: string;
}

export interface WikiPage {
  slug: string;
  title: string;
  summary: string;
  type: "hub" | "entity" | "concept";
  sources: string[];
  updated?: string;
  contradictions?: string[];
  content: string;
  html: string;
  links: string[];
}

export interface ResumeData {
  content: string;
  html: string;
  frontmatter: Record<string, unknown>;
}

function entryToBlogPost(e: Entry): BlogPost {
  return {
    slug: e.slug,
    title: e.title,
    date: e.date,
    summary: e.summary,
    tags: e.tags,
    content: e.content,
    html: e.html,
  };
}

function entryToProject(e: Entry): Project {
  return {
    slug: e.slug,
    title: e.title,
    date: e.date,
    summary: e.summary,
    tags: e.tags,
    url: e.url,
    github: e.github,
    pdf: e.pdf,
    status: e.status,
    kind: e.type === "visual" ? "visual" : "project",
    visualPath: e.visualPath,
    image: e.image,
    featured: e.featured,
    content: e.content,
    html: e.html,
  };
}

/** Blog tab — entries with type: post */
export async function getBlogPosts(): Promise<BlogPost[]> {
  const entries = await getEntries({ type: "post" });
  return entries.map(entryToBlogPost);
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const entry = await getEntry(slug);
  if (!entry || entry.type !== "post") return null;
  return entryToBlogPost(entry);
}

/** Projects + visuals (filter with .kind or getEntries({ type })) */
export async function getProjects(): Promise<Project[]> {
  const entries = await getEntries({ type: ["project", "visual"] });
  return entries.map(entryToProject);
}

export async function getProject(slug: string): Promise<Project | null> {
  const entry = await getEntry(slug);
  if (!entry || entry.type === "post") return null;
  return entryToProject(entry);
}

export async function getResume(): Promise<ResumeData | null> {
  const file = path.join(CONTENT_ROOT, "sources", "resume.md");
  try {
    const raw = await fs.readFile(file, "utf-8");
    const parsed = await parseMarkdown(raw, "resume");
    return {
      content: parsed.content,
      html: parsed.html,
      frontmatter: parsed.frontmatter,
    };
  } catch {
    return null;
  }
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

export async function getWikiPages(): Promise<WikiPage[]> {
  const dir = path.join(CONTENT_ROOT, "wiki");
  const files = await listMarkdownFiles(dir);
  const pages: WikiPage[] = [];

  for (const file of files) {
    const raw = await fs.readFile(path.join(dir, file), "utf-8");
    const slug = file.replace(/\.md$/, "");
    // Peek title from frontmatter before HTML render so we can drop duplicate H1
    const { data: fmPeek, content: bodyPeek } = matter(raw);
    const titlePeek = (fmPeek as WikiFrontmatter).title ?? slug;
    const bodyForRender = stripDuplicateTitleH1(bodyPeek, titlePeek);
    const fmBlock = raw.match(/^---[\s\S]*?---\n?/);
    const rawForRender = `${fmBlock ? fmBlock[0] : ""}${bodyForRender}`;
    const withLinks = renderWikiLinks(rawForRender);
    const parsed = await parseMarkdown<WikiFrontmatter>(withLinks, slug);
    const links = extractWikiLinks(parsed.content);
    const originalLinks = extractWikiLinks(bodyPeek);
    pages.push({
      slug,
      title: parsed.frontmatter.title ?? slug,
      summary: parsed.frontmatter.summary ?? "",
      type: parsed.frontmatter.type ?? "concept",
      sources: parsed.frontmatter.sources ?? [],
      updated: parsed.frontmatter.updated,
      contradictions: parsed.frontmatter.contradictions,
      content: parsed.content,
      html: parsed.html,
      links: originalLinks.length ? originalLinks : links,
    });
  }

  return pages.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getWikiPage(slug: string): Promise<WikiPage | null> {
  const pages = await getWikiPages();
  return pages.find((p) => p.slug === slug) ?? null;
}

export async function getSourceFile(relativePath: string): Promise<string | null> {
  // Prefer entries/, fall back to legacy paths during transition
  const candidates = [
    path.join(CONTENT_ROOT, "sources", relativePath),
    path.join(CONTENT_ROOT, "sources", "entries", relativePath),
  ];
  for (const file of candidates) {
    try {
      return await fs.readFile(file, "utf-8");
    } catch {
      /* try next */
    }
  }
  return null;
}
