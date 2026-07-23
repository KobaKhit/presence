import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";

export interface ParsedMarkdown<T = Record<string, unknown>> {
  frontmatter: T;
  content: string;
  html: string;
  slug: string;
}

/** Wrap <table> nodes in a scroll container (wide / tall tables stay usable). */
function rehypeScrollableTables() {
  return (tree: unknown) => {
    visit(tree as never, "element", (node: { tagName?: string }, index, parent) => {
      if (node.tagName !== "table" || !parent || typeof index !== "number") return;
      const parentNode = parent as {
        type?: string;
        properties?: { className?: string | string[] };
        children: unknown[];
      };
      if (parentNode.type === "element" && parentNode.properties?.className) {
        const cls = parentNode.properties.className;
        const list = Array.isArray(cls) ? cls.map(String) : [String(cls)];
        if (list.includes("table-scroll")) return;
      }
      parentNode.children[index] = {
        type: "element",
        tagName: "div",
        properties: { className: ["table-scroll"] },
        children: [node],
      };
    });
  };
}

export async function parseMarkdown<T = Record<string, unknown>>(
  raw: string,
  slug: string,
): Promise<ParsedMarkdown<T>> {
  const { data, content } = matter(raw);
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(rehypeRaw)
    .use(rehypeScrollableTables)
    .use(rehypeStringify)
    .process(content);
  return {
    frontmatter: data as T,
    content,
    html: processed.toString(),
    slug,
  };
}

/** Normalize a captured wiki-link target (strips accidental leading `[` from `[[[slug]]]`). */
function normalizeWikiLinkTarget(raw: string): string {
  return raw
    .split("|")[0]
    .trim()
    .replace(/^\[+/, "")
    .replace(/\]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

/** Extract [[wiki-links]] from markdown body (skip fenced/inline code). */
export function extractWikiLinks(content: string): string[] {
  const withoutCode = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "");
  const links = new Set<string>();
  // Allow 2+ brackets so [[[slug]]] / [[[[slug]]]] still resolve
  const re = /\[{2,}([^\]]+?)\]{2,}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(withoutCode)) !== null) {
    const target = normalizeWikiLinkTarget(match[1]);
    if (target) links.add(target);
  }
  return [...links];
}

/** Convert [[wiki-links]] to markdown links pointing at /wiki/[slug]. */
export function renderWikiLinks(content: string): string {
  return content.replace(/\[{2,}([^\]]+?)\]{2,}/g, (_, inner: string) => {
    const parts = inner.split("|").map((s: string) => s.trim());
    const rawTarget = (parts[0] ?? "").replace(/^\[+/, "").replace(/\]+$/, "").trim();
    const label = (parts[1] || rawTarget).replace(/^\[+/, "").replace(/\]+$/, "").trim();
    const slug = normalizeWikiLinkTarget(rawTarget);
    return `[${label}](/wiki/${slug})`;
  });
}

/** Strip a leading ATX H1 when it matches the page title (display-only; avoids duplicate H1). */
export function stripDuplicateTitleH1(content: string, title: string): string {
  const normalizedTitle = title.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalizedTitle) return content;
  return content.replace(/^(\s*)#\s+(.+?)\s*(?:\n+|$)/, (match, ws: string, heading: string) => {
    const normalizedHeading = heading.trim().toLowerCase().replace(/\s+/g, " ");
    if (normalizedHeading === normalizedTitle) return ws;
    return match;
  });
}
