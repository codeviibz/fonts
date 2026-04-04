import { createHash, randomUUID } from "node:crypto";
import {
  getFoundryIdByFamilyId,
  logDownloadRequest,
} from "@/lib/db/queries";
import { evaluateDownloadAccess } from "@/lib/entitlements";
import { fileExists, getFileBuffer } from "@/lib/storage";

export class DownloadError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "DownloadError";
  }
}

const FORMAT_CONTENT_TYPES: Record<string, string> = {
  otf: "font/otf",
  ttf: "font/ttf",
  woff2: "font/woff2",
  woff: "font/woff",
};

export interface PrepareDownloadParams {
  userId: number;
  fontWeightId: string;
  format: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface PreparedDownload {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

export async function prepareDownload(
  params: PrepareDownloadParams
): Promise<PreparedDownload> {
  const requestedFormat = params.format.toLowerCase();
  const access = await evaluateDownloadAccess(
    params.userId,
    params.fontWeightId,
    requestedFormat
  );
  if (!access.allowed) {
    throw new DownloadError(access.reason, 403);
  }

  const { entitlement, fontWeight } = access;
  const downloadPath = fontWeight.download_path;
  if (!downloadPath) {
    throw new DownloadError("No download file configured for this weight", 403);
  }

  const exists = await fileExists(downloadPath);
  if (!exists) {
    throw new DownloadError("File not found on disk", 404);
  }

  const foundryId = await getFoundryIdByFamilyId(fontWeight.family_id);
  if (!foundryId) {
    throw new DownloadError("Foundry not found for this font family", 404);
  }

  const requestToken = randomUUID();
  const signedUrlHash = createHash("sha256")
    .update(requestToken)
    .digest("hex");

  await logDownloadRequest({
    userId: params.userId,
    fontWeightId: params.fontWeightId,
    fontFamilyId: fontWeight.family_id,
    foundryId,
    entitlementId: entitlement.id,
    format: requestedFormat,
    signedUrlHash,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });

  const buffer = await getFileBuffer(downloadPath);
  const contentType =
    FORMAT_CONTENT_TYPES[requestedFormat] ?? "application/octet-stream";
  const filename =
    downloadPath.split("/").pop() ?? `font.${requestedFormat}`;

  return { buffer, contentType, filename };
}
