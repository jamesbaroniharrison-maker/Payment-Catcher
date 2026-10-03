"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="border rounded px-3 py-2 text-sm font-medium"
    >
      Log out
    </button>
  );
}
