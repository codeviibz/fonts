import { NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { createMockSubscription, PaymentError } from "@/lib/payments";

export async function POST() {
  try {
    const session = await requireAuth();
    const result = await createMockSubscription(session.user.id);

    return NextResponse.json({
      ok: true,
      subscriptionId: result.subscriptionId,
    });
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
