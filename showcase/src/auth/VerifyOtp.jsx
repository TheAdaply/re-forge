import { useState } from "react";
import { useAuth } from "./auth-context.js";

// Step 2 of sign-up: enter the 6-digit code Supabase emailed. verifyOtp with
// type:"signup" confirms the email; that confirm fires the DB trigger, which
// consumes the org code and creates the named member. On success a session is
// set and onAuthStateChange (in AuthProvider) swaps the app to the dashboard —
// no manual redirect needed.
export default function VerifyOtp({ email, orgName, onBack }) {
  const { supabase } = useAuth();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!supabase || busy) return;
    setError("");
    setBusy(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: token.trim(),
        type: "signup",
      });
      if (verifyError) {
        // Covers a wrong/expired code AND the fail-closed DB trigger (e.g. the org
        // code was exhausted between signup and verify).
        setError(verifyError.message || "That code is invalid or expired.");
      }
      // Success path is handled by onAuthStateChange (SIGNED_IN) upstream.
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!supabase || busy) return;
    setError("");
    setResent(false);
    setBusy(true);
    try {
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
      if (resendError) {
        setError(resendError.message || "Could not resend the code.");
      } else {
        setResent(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <span className="eyebrow">Verify your email</span>
      <h2 className="display auth-title">Enter your 6-digit code.</h2>
      <p className="auth-sub">
        We emailed a code to <strong>{email}</strong>
        {orgName ? <> to finish joining <strong>{orgName}</strong></> : null}.
      </p>

      <label className="auth-field">
        <span>Verification code</span>
        <input
          className="mono auth-otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
          required
        />
      </label>

      {error && <p className="auth-error" role="alert">{error}</p>}
      {resent && <p className="auth-note">A new code is on its way.</p>}

      <button
        className="btn btn-primary auth-submit"
        type="submit"
        disabled={busy || token.length < 6 || !supabase}
      >
        {busy ? "Verifying…" : "Verify & continue"}
      </button>

      <p className="auth-alt">
        Didn&apos;t get it?{" "}
        <button type="button" className="auth-link" onClick={resend} disabled={busy}>
          Resend code
        </button>
        {" · "}
        <button type="button" className="auth-link" onClick={onBack}>
          Start over
        </button>
      </p>
    </form>
  );
}
