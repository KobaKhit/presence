import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getEntry, resolveEntryAsset } from "@/lib/content/entries";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".csv": "text/csv; charset=utf-8",
  ".tsv": "text/tab-separated-values; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

/**
 * Serve sibling assets from content/sources/entries/{slug}/…
 * e.g. /entries/nba-3pt-spiral/nba_3pt_spiral.html
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; path: string[] }> },
) {
  const { slug, path: parts } = await params;
  const entry = await getEntry(slug);
  if (!entry?.dir) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const assetRel = parts.join("/");
  const abs = resolveEntryAsset(entry.dir, assetRel);
  if (!abs) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const data = await fs.readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    const contentType = MIME[ext] ?? "application/octet-stream";
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
