// Shared API response types used by route handlers and client code.

export interface ApiErrorResponse {
  error: string;
}

export interface ApiSuccessResponse<T = unknown> {
  ok: true;
  data?: T;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ── Session ────────────────────────────────────────────────

export interface SessionUser {
  id: number;
  email: string;
  name?: string | null;
  role: "subscriber" | "admin";
}

// ── Checkout / Subscription ────────────────────────────────

export interface CheckoutResponse {
  ok: true;
  subscriptionId: string;
}

export interface CancelSubscriptionResponse {
  ok: true;
}

// ── Download ───────────────────────────────────────────────

export interface DownloadAccessDenied {
  allowed: false;
  reason: string;
}

export interface DownloadAccessGranted {
  allowed: true;
  entitlementId: string;
  format: string;
}

export type DownloadAccessResult = DownloadAccessGranted | DownloadAccessDenied;
