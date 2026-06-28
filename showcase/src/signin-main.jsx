import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import AuthProvider from "./auth/AuthProvider.jsx";
import AuthScreen from "./auth/AuthScreen.jsx";
import { useAuth } from "./auth/auth-context.js";

import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/auth.css";

// The /signin page. Shows the sign-in / sign-up / verify surface; the moment a
// session exists, hands off to the dashboard. With placeholder Supabase creds the
// provider still resolves to "ready" with no session (see AuthProvider) so the
// screen renders and its own actions report the real error — it never hangs.
function SignInPage() {
  const { session, status } = useAuth();
  useEffect(() => {
    if (session) window.location.assign("/dashboard/");
  }, [session]);
  if (status === "loading" || session) {
    return <div className="auth-screen" aria-busy="true" />;
  }
  return <AuthScreen />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <SignInPage />
    </AuthProvider>
  </StrictMode>,
);
