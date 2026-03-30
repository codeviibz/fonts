import { getSession } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/db/queries";
import { SubscribeClient } from "./subscribe-client";

export default async function SubscribePage() {
  const session = await getSession();
  let hasActiveSubscription = false;

  if (session?.user?.id) {
    const sub = await getActiveSubscription(session.user.id);
    hasActiveSubscription = !!sub;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-8 p-8">
      <div className="w-full space-y-2 text-center">
        <h1 className="text-3xl font-semibold">Subscribe</h1>
        <p className="text-sm text-muted-foreground">
          Dev-mode mock billing — no real charges
        </p>
      </div>

      <SubscribeClient
        isLoggedIn={!!session?.user}
        hasActiveSubscription={hasActiveSubscription}
      />
    </main>
  );
}
