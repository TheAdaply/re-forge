import { useState } from "react";
import { useAuth } from "./auth-context.js";

// Email + password sign-in. On success a session is set and onAuthStateChange
// swaps the app to the dashboard. If the account exists but was never verified,
// route the user back to the OTP step so they can finish.
export default function SignIn({ onSwitchToSignUp, onNeedsVerify }) {
  const { supabase } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (!supabase || busy) return;
    setError("");
    setBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        const msg = (signInError.message || "").toLowerCase();
        if (msg.includes("not confirmed") || msg.includes("not verified")) {
          // Unverified account: send a fresh OTP and move to the verify step.
          await supabase.auth.resend({ type: "signup", email: email.trim() });
          onNeedsVerify(email.trim());
          return;
        }
        // Generic, non-enumerating message (don't reveal which field was wrong).
        setError("Invalid email or password.");
      }
      // Success: handled by onAuthStateChange upstream.
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <span className="eyebrow">Welcome back</span>
      <h2 className="display auth-title">Sign in to re-forge.</h2>

      <label className="auth-field">
        <span>Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <label className="auth-field">
        <span>Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      {error && <p className="auth-error" role="alert">{error}</p>}

      <button className="btn btn-primary auth-submit" type="submit" disabled={busy || !supabase}>
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <p className="auth-alt">
        Have an org code?{" "}
        <button type="button" className="auth-link" onClick={onSwitchToSignUp}>
          Create an account
        </button>
      </p>
    </form>
  );
}
