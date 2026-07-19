import { NextResponse } from "next/server";
import { getWikiPage } from "@/lib/content/loaders";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (slug === "graph") {
    // Handled by dedicated route; keep typed fallback
    return NextResponse.json({ error: "Use /api/v1/wiki/graph" }, { status: 404 });
  }
  const page = await getWikiPage(slug);
  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(page);
}
