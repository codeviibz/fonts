import { NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { cancelMockSubscription, PaymentError } from "@/lib/payments";

export async function POST() {
  try {
    const session = await requireAuth();
    await cancelMockSubscription(session.user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    if (err instanceof PaymentError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
