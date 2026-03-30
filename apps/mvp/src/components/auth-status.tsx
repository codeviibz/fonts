"use client";

import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function AuthStatus({ session }: { session: Session | null }) {
  if (!session?.user) {
    return (
      <div className="rounded-md border border-border p-4">
        <p className="text-sm text-muted-foreground">Not signed in</p>
        <a href="/login">
          <Button variant="outline" size="sm" className="mt-2">
            Sign in
          </Button>
        </a>
      </div>
    );
  }

  const { user } = session;

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">{user.name ?? user.email}</p>
          <p className="text-xs text-muted-foreground">
            {user.email} &middot; {user.role}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
