import { randomUUID, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { evaluateDownloadAccess } from "@/lib/entitlements";
import { getFileBuffer, fileExists } from "@/lib/storage";
import { logDownloadRequest } from "@/lib/db/queries";

interface RouteContext {
  params: Promise<{ fontWeightId: string }>;
}

const FORMAT_CONTENT_TYPES: Record<string, string> = {
  otf: "font/otf",
  ttf: "font/ttf",
  woff2: "font/woff2",
  woff: "font/woff",
};

export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAuth();
    const userId = Number(session.user.id);
    const { fontWeightId } = await ctx.params;

    const format =
      request.nextUrl.searchParams.get("format") ?? "otf";

    const access = await evaluateDownloadAccess(userId, fontWeightId, format);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.reason },
        { status: 403 }
      );
    }

    const { entitlement, fontWeight } = access;

    const exists = await fileExists(fontWeight.download_path!);
    if (!exists) {
      return NextResponse.json(
        { error: "File not found on disk" },
        { status: 404 }
      );
    }

    const requestToken = randomUUID();
    const signedUrlHash = createHash("sha256")
      .update(requestToken)
      .digest("hex");

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;
    const userAgent = request.headers.get("user-agent") ?? null;

    await logDownloadRequest({
      userId,
      fontWeightId,
      fontFamilyId: fontWeight.family_id,
      foundryId: await resolveFoundryId(fontWeight.family_id),
      entitlementId: entitlement.id,
      format,
      signedUrlHash,
      ipAddress: ip,
      userAgent,
    });

    const buffer = await getFileBuffer(fontWeight.download_path!);
    const contentType = FORMAT_CONTENT_TYPES[format] ?? "application/octet-stream";
    const filename = fontWeight.download_path!.split("/").pop() ?? `font.${format}`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("[download]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function resolveFoundryId(familyId: string): Promise<string> {
  const { pool } = await import("@/lib/db/client");
  const result = await pool.query<{ foundry_id: string }>(
    "SELECT foundry_id FROM font_families WHERE id = $1",
    [familyId]
  );
  return result.rows[0]?.foundry_id ?? "";
}
