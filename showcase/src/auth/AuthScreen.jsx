import { useState } from "react";
import SignIn from "./SignIn.jsx";
import SignUp from "./SignUp.jsx";
import VerifyOtp from "./VerifyOtp.jsx";

// Stateless-from-the-outside auth surface: switches between sign-in, sign-up, and
// the 6-digit verify step. Shown by SessionGuard whenever there is no session.
export default function AuthScreen() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "verify"
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingOrg, setPendingOrg] = useState(null);

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <a className="auth-brand" href="/">
          <img src="/logo.jpeg" alt="re-forge logo" width="32" height="32" />
          <span className="brand-name">re-forge</span>
        </a>

        {mode === "signin" && (
          <SignIn
            onSwitchToSignUp={() => setMode("signup")}
            onNeedsVerify={(email) => {
              setPendingEmail(email);
              setPendingOrg(null);
              setMode("verify");
            }}
          />
        )}

        {mode === "signup" && (
          <SignUp
            onSwitchToSignIn={() => setMode("signin")}
            onPendingVerify={(email, orgName) => {
              setPendingEmail(email);
              setPendingOrg(orgName);
              setMode("verify");
            }}
          />
        )}

        {mode === "verify" && (
          <VerifyOtp
            email={pendingEmail}
            orgName={pendingOrg}
            onBack={() => setMode("signin")}
          />
        )}
      </div>
    </div>
  );
}
