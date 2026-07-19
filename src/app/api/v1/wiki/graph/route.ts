import { NextResponse } from "next/server";
import { getKnowledgeProvider } from "@/lib/knowledge";

export async function GET() {
  const provider = getKnowledgeProvider();
  const graph = await provider.getGraph();
  return NextResponse.json(graph);
}
