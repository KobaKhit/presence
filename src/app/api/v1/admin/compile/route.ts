import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/admin";
import { getPublishJobRunner } from "@/lib/publishing";

export const runtime = "nodejs";

/**
 * Admin compile endpoint — rebuilds adjacency index from wiki markdown.
 * Full LLM synthesis belongs in the CLI; this keeps UI compile zero-config.
 * Requires PRESENCE_ADMIN_TOKEN in production.
 */
export async function POST(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;

  try {
    const runner = getPublishJobRunner();
    const job = await runner.enqueue("compile-graph");

    // Wait briefly for local runner to finish graph compile
    for (let i = 0; i < 40; i++) {
      const current = await runner.getJob(job.id);
      if (!current) break;
      if (current.status === "succeeded") {
        return NextResponse.json({
          ok: true,
          jobId: current.id,
          ...current.result,
        });
      }
      if (current.status === "failed") {
        return NextResponse.json(
          { error: current.error ?? "Compile failed", jobId: current.id },
          { status: 500 },
        );
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    return NextResponse.json({
      ok: true,
      jobId: job.id,
      status: "queued",
      note: "Compile job enqueued. Poll is not yet exposed; re-run if needed.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Compile failed" },
      { status: 500 },
    );
  }
}
