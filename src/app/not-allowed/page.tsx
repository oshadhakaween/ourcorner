// Shown when someone logs in with an account that is NOT on the allowed list.
export default function NotAllowed() {
  return (
    <main className="auth-page">
      <div className="wash" />
      <div className="auth-big">🔒</div>
      <h1 className="auth-title">
        This corner is <em>private</em>
      </h1>
      <p className="auth-sub">
        This account is not on the list. Log in with the email address that was set up for this site.
      </p>
      <a className="auth-btn" href="/sign-out">
        Use a different account
      </a>
    </main>
  );
}
