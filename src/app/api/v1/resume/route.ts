import { NextResponse } from "next/server";
import { getResume } from "@/lib/content/loaders";

export async function GET() {
  const resume = await getResume();
  if (!resume) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(resume);
}
