import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";

export interface ParsedMarkdown<T = Record<string, unknown>> {
  frontmatter: T;
  content: string;
  html: string;
  slug: string;
}

export async function parseMarkdown<T = Record<string, unknown>>(
  raw: string,
  slug: string,
): Promise<ParsedMarkdown<T>> {
  const { data, content } = matter(raw);
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify)
    .process(content);
  return {
    frontmatter: data as T,
    content,
    html: processed.toString(),
    slug,
  };
}

/** Extract [[wiki-links]] from markdown body (skip fenced/inline code). */
export function extractWikiLinks(content: string): string[] {
  const withoutCode = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "");
  const links = new Set<string>();
  const re = /\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(withoutCode)) !== null) {
    const target = match[1].split("|")[0].trim().toLowerCase().replace(/\s+/g, "-");
    if (target) links.add(target);
  }
  return [...links];
}

/** Convert [[wiki-links]] to markdown links pointing at /wiki/[slug]. */
export function renderWikiLinks(content: string): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (_, inner: string) => {
    const [target, label] = inner.split("|").map((s) => s.trim());
    const slug = target.toLowerCase().replace(/\s+/g, "-");
    return `[${label || target}](/wiki/${slug})`;
  });
}
