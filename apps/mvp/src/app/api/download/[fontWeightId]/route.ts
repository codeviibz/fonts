import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { DownloadError, prepareDownload } from "@/lib/downloads";

interface RouteContext {
  params: Promise<{ fontWeightId: string }>;
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAuth();
    const userId = Number(session.user.id);
    const { fontWeightId } = await ctx.params;

    const format = request.nextUrl.searchParams.get("format") ?? "otf";

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;
    const userAgent = request.headers.get("user-agent") ?? null;

    const prepared = await prepareDownload({
      userId,
      fontWeightId,
      format,
      ipAddress: ip,
      userAgent,
    });

    return new NextResponse(new Uint8Array(prepared.buffer), {
      status: 200,
      headers: {
        "Content-Type": prepared.contentType,
        "Content-Disposition": `attachment; filename="${prepared.filename}"`,
        "Content-Length": String(prepared.buffer.byteLength),
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
    if (error instanceof DownloadError) {
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
