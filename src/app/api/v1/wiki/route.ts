import { NextResponse } from "next/server";
import { getWikiPages } from "@/lib/content/loaders";

export async function GET() {
  const pages = await getWikiPages();
  return NextResponse.json(
    pages.map(({ slug, title, summary, type, sources, links }) => ({
      slug,
      title,
      summary,
      type,
      sources,
      links,
    })),
  );
}
