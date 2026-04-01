import { getActiveEntitlement, getFontWeightById } from "@/lib/db/queries";
import type { DbEntitlement, DbFontWeight } from "@/types/database";

export interface DownloadAccessResult {
  allowed: true;
  entitlement: DbEntitlement;
  fontWeight: DbFontWeight;
}

export interface DownloadAccessDenied {
  allowed: false;
  reason: string;
}

export async function evaluateDownloadAccess(
  userId: number,
  fontWeightId: string,
  requestedFormat: string
): Promise<DownloadAccessResult | DownloadAccessDenied> {
  const normalizedRequestedFormat = requestedFormat.toLowerCase();
  const entitlement = await getActiveEntitlement(userId);
  if (!entitlement) {
    return { allowed: false, reason: "No active entitlement" };
  }

  const fontWeight = await getFontWeightById(fontWeightId);
  if (!fontWeight) {
    return { allowed: false, reason: "Font weight not found" };
  }

  if (!fontWeight.is_active) {
    return { allowed: false, reason: "Font weight is no longer available" };
  }

  if (!fontWeight.download_path) {
    return { allowed: false, reason: "No download file configured for this weight" };
  }

  const fontWeightFormats = new Set(
    (fontWeight.allowed_formats ?? ["otf", "ttf", "woff2"]).map((f) =>
      f.toLowerCase()
    )
  );
  const entitlementFormats = new Set(
    (entitlement.allowed_formats ?? ["otf", "ttf", "woff2"]).map((f) =>
      f.toLowerCase()
    )
  );

  const allowedFormats = [...fontWeightFormats].filter((format) =>
    entitlementFormats.has(format)
  );

  if (!allowedFormats.includes(normalizedRequestedFormat)) {
    return {
      allowed: false,
      reason: `Format "${requestedFormat}" is not allowed for this entitlement`,
    };
  }

  return { allowed: true, entitlement, fontWeight };
}
