import { NextResponse } from "next/server";
import { SearchQuerySchema } from "@/lib/api/schemas";
import { getKnowledgeProvider } from "@/lib/knowledge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = SearchQuerySchema.safeParse({
    q: searchParams.get("q"),
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const provider = getKnowledgeProvider();
  const result = await provider.search(parsed.data.q, {
    limit: parsed.data.limit,
    expandHops: 1,
    includeSources: true,
  });

  return NextResponse.json({
    query: result.query,
    documents: result.documents.map(({ id, title, kind, slug, summary, score }) => ({
      id,
      title,
      kind,
      slug,
      summary,
      score,
    })),
    expandedFrom: result.expandedFrom,
  });
}
