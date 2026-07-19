import { NextResponse } from "next/server";
import { WikiProposeSchema } from "@/lib/api/schemas";
import { getKnowledgeProvider } from "@/lib/knowledge";
import { proposeWikiPageFromChat } from "@/lib/llm";

export const runtime = "nodejs";

function assertAdmin(request: Request): NextResponse | null {
  const token =
    process.env.PRESENCE_ADMIN_TOKEN?.trim() || process.env.PERSONA_ADMIN_TOKEN?.trim();
  if (!token) return null;
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const alt =
    request.headers.get("x-presence-admin-token") ||
    request.headers.get("x-persona-admin-token");
  if (bearer === token || alt === token) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Draft a wiki page from a chat Q&A for human approval (save-back loop).
 */
export async function POST(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = WikiProposeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const provider = getKnowledgeProvider();
  const pages = await provider.listPages();
  const proposal = await proposeWikiPageFromChat({
    question: parsed.data.question,
    answer: parsed.data.answer,
    sourceSlugs: parsed.data.sourceSlugs,
    existingSlugs: pages.map((p) => p.slug),
  });

  if (!proposal) {
    return NextResponse.json(
      {
        error:
          "Could not propose a wiki page. Configure OPENROUTER_API_KEY (or OPENAI_API_KEY) and try again.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ proposal });
}
