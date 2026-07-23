import { NextResponse } from "next/server";
import { WikiSaveSchema } from "@/lib/api/schemas";
import { assertAdmin } from "@/lib/auth/admin";
import {
  getKnowledgeProvider,
  writeWikiGraph,
  WikiKnowledgeProvider,
} from "@/lib/knowledge";

export const runtime = "nodejs";

/**
 * Persist an approved wiki page proposal (human-in-the-loop save-back).
 */
export async function POST(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = WikiSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { proposal, approved } = parsed.data;
  if (!approved) {
    return NextResponse.json({ ok: false, reason: "not_approved" });
  }

  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const wikiDir = path.join(process.cwd(), "content", "wiki");
    await fs.mkdir(wikiDir, { recursive: true });
    const file = path.join(wikiDir, `${proposal.slug}.md`);
    const today = new Date().toISOString().slice(0, 10);
    const sourcesYaml =
      proposal.sources.length > 0
        ? proposal.sources.map((s) => `  - ${s}`).join("\n")
        : "  []";
    const markdown = `---
title: "${proposal.title.replace(/"/g, '\\"')}"
summary: "${proposal.summary.replace(/"/g, '\\"')}"
type: ${proposal.type}
sources:
${sourcesYaml}
updated: "${today}"
---

# ${proposal.title}

${proposal.content.trim()}
`;
    await fs.writeFile(file, markdown.endsWith("\n") ? markdown : `${markdown}\n`, "utf-8");

    const provider = getKnowledgeProvider();
    if (provider instanceof WikiKnowledgeProvider) {
      const graph = await provider.buildGraphFromPages();
      await writeWikiGraph(graph);
    }

    return NextResponse.json({
      ok: true,
      slug: proposal.slug,
      path: `/wiki/${proposal.slug}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
