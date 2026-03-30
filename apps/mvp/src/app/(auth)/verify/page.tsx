export default function VerifyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 p-8">
      <div className="w-full space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Check your console</h1>
        <p className="text-muted-foreground">
          A magic link has been logged to the terminal running your dev server.
          Click the URL to complete sign-in.
        </p>
        <p className="text-sm text-muted-foreground">
          The link expires in 24 hours.
        </p>
      </div>
    </main>
  );
}
