"use client";
import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";

// Opening /sign-out logs you out and sends you back to the login page.
export default function SignOutPage() {
  const { signOut } = useClerk();

  useEffect(() => {
    fetch("/api/logout", { method: "POST" })
      .catch(() => {})
      .finally(() => {
        signOut({ redirectUrl: "/sign-in" });
      });
  }, [signOut]);

  return (
    <main className="auth-page">
      <div className="wash" />
      <div className="auth-big">👋</div>
      <h1 className="auth-title">
        See you <em>soon</em>
      </h1>
      <p className="auth-note">Signing you out...</p>
    </main>
  );
}
