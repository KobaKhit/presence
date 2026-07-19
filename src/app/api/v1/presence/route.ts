import { NextResponse } from "next/server";
import { getPresenceConfig } from "@/lib/config";

export const dynamic = "force-static";

export async function GET() {
  const c = getPresenceConfig();
  return NextResponse.json({
    name: c.name,
    fullName: c.fullName,
    tagline: c.tagline,
    bio: c.bio,
    location: c.location,
    email: c.email,
    website: c.website,
    social: c.social,
  });
}
