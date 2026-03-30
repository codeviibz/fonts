import { getSession } from "@/lib/auth";
import { AuthStatus } from "@/components/auth-status";

export default async function Home() {
  const session = await getSession();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Fonts</h1>
        <p className="text-muted-foreground">
          Font subscription platform — local MVP
        </p>
      </div>
      <AuthStatus session={session} />
    </main>
  );
}
