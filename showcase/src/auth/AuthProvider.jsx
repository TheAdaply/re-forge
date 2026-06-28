import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "./supabase.js";
import { AuthContext } from "./auth-context.js";

// Loads the supabase client, reads the persisted session, and keeps it live via
// onAuthStateChange. Wrap the app once near the root; read it with useAuth().
export default function AuthProvider({ children }) {
  const [supabase, setSupabase] = useState(null);
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("loading");
  const subRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    getSupabase()
      .then(async (client) => {
        if (!mounted) return;
        setSupabase(client);

        const { data } = await client.auth.getSession();
        if (!mounted) return;
        setSession(data.session ?? null);
        setStatus("ready");

        const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
          setSession(next ?? null);
        });
        subRef.current = sub;
      })
      .catch((err) => {
        // Misconfigured site-config.json or network failure: surface "ready" with
        // no session so the auth screen renders (and its own actions report the
        // real error) instead of an infinite spinner.
        console.error("auth init failed:", err);
        if (mounted) setStatus("ready");
      });

    return () => {
      mounted = false;
      subRef.current?.subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ supabase, session, user: session?.user ?? null, status }),
    [supabase, session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
