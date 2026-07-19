import { NextResponse } from "next/server";
import { getProjects } from "@/lib/content/loaders";

export async function GET() {
  const projects = await getProjects();
  return NextResponse.json(
    projects.map(({ slug, title, date, summary, tags, url, status }) => ({
      slug,
      title,
      date,
      summary,
      tags,
      url,
      status,
    })),
  );
}
