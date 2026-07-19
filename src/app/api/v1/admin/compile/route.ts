import { NextResponse } from "next/server";
import { getKnowledgeProvider, writeWikiGraph, WikiKnowledgeProvider } from "@/lib/knowledge";

/**
 * Admin compile endpoint — rebuilds adjacency index from wiki markdown.
 * Full LLM synthesis belongs in the CLI; this keeps UI compile zero-config.
 */
export async function POST() {
  if (process.env.PRESENCE_ADMIN_TOKEN || process.env.PERSONA_ADMIN_TOKEN) {
    // Optional lock for production
  }

  try {
    const provider = getKnowledgeProvider();
    if (!(provider instanceof WikiKnowledgeProvider)) {
      return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }

    const graph = await provider.buildGraphFromPages();
    await writeWikiGraph(graph);
    const report = await provider.doctor();

    return NextResponse.json({
      ok: true,
      pageCount: report.pageCount,
      linkCount: report.linkCount,
      orphans: report.orphans,
      missingTargets: report.missingTargets,
      note: "Graph index refreshed from content/wiki. Run `npm run presence -- compile` for LLM page synthesis (OPENROUTER_API_KEY preferred).",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Compile failed" },
      { status: 500 },
    );
  }
}
