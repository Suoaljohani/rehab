import { NextResponse } from "next/server";
import { getCms } from "@/lib/public-data";

const ALLOWED_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/brand/`;

/**
 * Serves the hospital's official logo from this origin: no third-party request
 * for visitors, long-lived caching (URLs are versioned), and a locked-down
 * policy so an SVG opened directly can never run anything.
 */
export async function GET() {
  const cms = await getCms();
  const url = (cms.brand?.logo_url as string | null) ?? null;
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
