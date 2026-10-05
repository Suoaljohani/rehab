import { NextResponse, type NextRequest } from "next/server";
import { getCms } from "@/lib/public-data";

const ALLOWED_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/brand/`;
const FIELD: Record<string, string> = { logo: "logo_url", mark: "logo_mark_url", full: "logo_full_url" };

/**
 * Serves the hospital's official logo files from this origin: no third-party
 * request for visitors, long-lived caching (URLs are versioned), and a
 * locked-down policy so an SVG opened directly can never run anything.
 */
export async function GET(req: NextRequest) {
  const field = FIELD[req.nextUrl.searchParams.get("kind") ?? "logo"];
  if (!field) return new NextResponse("Not found", { status: 404 });
  const cms = await getCms();
  const url = (cms.brand?.[field] as string | null) ?? null;
  if (!url || !url.startsWith(ALLOWED_PREFIX)) return new NextResponse("Not found", { status: 404 });
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return new NextResponse("Not found", { status: 404 });
  const type = res.headers.get("content-type") ?? "image/svg+xml";
  if (!/^image\/(svg\+xml|png|webp)/.test(type)) return new NextResponse("Unsupported", { status: 415 });
  return new NextResponse(await res.arrayBuffer(), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
