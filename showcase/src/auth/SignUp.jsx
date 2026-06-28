import { useState } from "react";
import { useAuth } from "./auth-context.js";

// Step 1 of sign-up: email + password + display name + ORG CODE. The org code is
// pre-validated via the validate_org_code RPC BEFORE auth.signUp, so a bad/used
// code never mints an auth user. On success we hand the email up to the verify
// step (Supabase has emailed a 6-digit OTP).
export default function SignUp({ onPendingVerify, onSwitchToSignIn }) {
  const { supabase } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (!supabase || busy) return;
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (displayName.trim().length === 0) {
      setError("Please enter your name.");
      return;
    }

    setBusy(true);
    try {
      // Pre-check the org code (anon RPC). Never reveals another org; returns
      // { ok } or { ok, org_name }.
      const { data: check, error: rpcError } = await supabase.rpc("validate_org_code", {
        p_code: orgCode.trim(),
      });
      if (rpcError) {
        setError("Could not verify the org code. Please try again.");
        return;
      }
      if (!check?.ok) {
        setError("That org code is invalid, already used, or expired.");
        return;
      }

      // Create the (unverified) auth user, carrying org_code + display_name in
      // user metadata. The DB trigger consumes the code and creates the named,
      // org-scoped member only once the email is verified.
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            org_code: orgCode.trim(),
            display_name: displayName.trim(),
          },
        },
      });
      if (signUpError) {
        setError(signUpError.message || "Sign-up failed. Please try again.");
        return;
      }

      onPendingVerify(email.trim(), check.org_name ?? null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <span className="eyebrow">Create your account</span>
      <h2 className="display auth-title">Join your team on re-forge.</h2>

      <label className="auth-field">
        <span>Org code</span>
        <input
          className="mono"
          type="text"
          autoComplete="off"
          placeholder="rfj_…"
          value={orgCode}
          onChange={(e) => setOrgCode(e.target.value)}
          required
        />
      </label>

      <label className="auth-field">
        <span>Your name</span>
        <input
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </label>

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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      {error && <p className="auth-error" role="alert">{error}</p>}

      <button className="btn btn-primary auth-submit" type="submit" disabled={busy || !supabase}>
        {busy ? "Checking…" : "Create account"}
      </button>

      <p className="auth-alt">
        Already have an account?{" "}
        <button type="button" className="auth-link" onClick={onSwitchToSignIn}>
          Sign in
        </button>
      </p>
    </form>
  );
}
