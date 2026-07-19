import { llmGenerateText } from "./provider";

export interface WikiPageProposal {
  title: string;
  slug: string;
  summary: string;
  type: "concept" | "entity" | "hub";
  content: string;
  sources: string[];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function parseJsonBlock(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : text.trim();
  return JSON.parse(raw);
}

/**
 * Turn a chat Q&A into a draft wiki page for human approval / save-back.
 */
export async function proposeWikiPageFromChat(input: {
  question: string;
  answer: string;
  sourceSlugs?: string[];
  existingSlugs?: string[];
}): Promise<WikiPageProposal | null> {
  const result = await llmGenerateText({
    system: `You propose a new LLM Wiki page from a grounded chat answer.
Return ONLY JSON:
{
  "title": string,
  "slug": "kebab-case",
  "summary": "one sentence",
  "type": "concept"|"entity"|"hub",
  "content": "markdown body WITHOUT frontmatter — use [[wiki-links]]",
  "sources": ["wiki-or-source-slugs"]
}
Do not invent facts beyond the answer. Prefer a focused concept page.`,
    prompt: `Question: ${input.question}

Answer:
${input.answer}

Cited sources: ${(input.sourceSlugs ?? []).join(", ") || "(none)"}
Existing wiki slugs: ${(input.existingSlugs ?? []).join(", ") || "(none)"}`,
    temperature: 0.25,
  });

  if (!result) return null;

  try {
    const parsed = parseJsonBlock(result.text) as Partial<WikiPageProposal>;
    const title = parsed.title?.trim();
    if (!title || !parsed.content?.trim()) return null;
    const slug = slugify(parsed.slug || title);
    return {
      title,
      slug,
      summary: parsed.summary?.trim() || title,
      type:
        parsed.type === "hub" || parsed.type === "entity" ? parsed.type : "concept",
      content: parsed.content.trim(),
      sources: Array.isArray(parsed.sources) ? parsed.sources.map(String) : [],
    };
  } catch {
    return null;
  }
}
