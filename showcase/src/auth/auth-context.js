import { createContext, useContext } from "react";

// Shared auth context. Kept in a plain .js module (no component export) so the
// react-refresh/only-export-components lint rule stays satisfied for the Provider.
//
// Shape: { supabase, session, user, status }
//   supabase : the memoized supabase-js client (null until loaded)
//   session  : the current Session or null
//   user     : session?.user ?? null (convenience)
//   status   : "loading" until the first getSession resolves, then "ready"
export const AuthContext = createContext({
  supabase: null,
  session: null,
  user: null,
  status: "loading",
});

export function useAuth() {
  return useContext(AuthContext);
}
