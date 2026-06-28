import { useAuth } from "./auth-context.js";
import AuthScreen from "./AuthScreen.jsx";

// The gate the dashboard sits behind. Place it (inside <AuthProvider>) around
// whatever the concurrent workflow builds as the signed-in app:
//
//   <AuthProvider>
//     <SessionGuard>
//       <Dashboard />
//     </SessionGuard>
//   </AuthProvider>
//
// loading  -> a quiet placeholder (no flash of the auth form)
// no session -> the email/password/verify screen
// session    -> the dashboard (children), reads already org-scoped by RLS
export default function SessionGuard({ children }) {
  const { status, session } = useAuth();

  if (status === "loading") {
    return (
      <div className="auth-screen">
        <div className="auth-loading mono">Loading…</div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return children;
}
