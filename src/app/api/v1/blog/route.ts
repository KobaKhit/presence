import { NextResponse } from "next/server";
import { getBlogPosts } from "@/lib/content/loaders";

export async function GET() {
  const posts = await getBlogPosts();
  return NextResponse.json(
    posts.map(({ slug, title, date, summary, tags }) => ({
      slug,
      title,
      date,
      summary,
      tags,
    })),
  );
}
