import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

interface AuthErrorPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  Verification: "This sign-in link is invalid or expired. Please request a new magic link.",
  AccessDenied: "Access denied. Please try signing in again.",
  Configuration: "Authentication is temporarily unavailable. Check local auth configuration.",
  Default: "We could not complete sign-in. Please try again.",
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const errorCode = params.error ?? "Default";
  const message = AUTH_ERROR_MESSAGES[errorCode] ?? AUTH_ERROR_MESSAGES.Default;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 p-8">
      <div className="w-full space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Sign-in issue</h1>
        <p className="text-muted-foreground">{message}</p>
        <div className="flex justify-center gap-3">
          <Link href="/login" className={buttonVariants()}>
            Back to login
          </Link>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
