import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerkTheme";

export default function Page() {
  return (
    <main className="auth-page">
      <div className="wash" />
      <div className="auth-brand">
        <span className="dot">♥</span>
        <span>Oshadha &amp; Chaya</span>
      </div>
      <h1 className="auth-title">
        Welcome <em>home</em>
      </h1>
      <p className="auth-sub">Just for the two of us. Log in to come in.</p>
      <div className="auth-card">
        {/* Suspense is required by Clerk here, or the build fails */}
        <Suspense fallback={<p className="auth-note">Loading...</p>}>
          <SignIn appearance={clerkAppearance} fallbackRedirectUrl="/" />
        </Suspense>
      </div>
    </main>
  );
}
