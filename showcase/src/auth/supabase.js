import { createClient } from "@supabase/supabase-js";
import { loadConfig } from "./config.js";

// Lazily build a single supabase-js client from the runtime config. Returns a
// memoized promise so concurrent callers share one client (and one auth/session
// store). The anon key is public by design; RLS + the org-scoped policies are
// what protect data, never key secrecy.
let clientPromise;

export function getSupabase() {
  if (!clientPromise) {
    clientPromise = loadConfig().then((cfg) => {
      const url = cfg.SUPABASE_URL;
      const key = cfg.SUPABASE_ANON_KEY;
      if (!url || !key || url.includes("YOUR_PROJECT_REF") || key.startsWith("REPLACE")) {
        throw new Error(
          "Supabase config missing — fill showcase/public/site-config.json with the project URL and anon key.",
        );
      }
      return createClient(url, key, {
        auth: {
          persistSession: true, // survive reloads (localStorage)
          autoRefreshToken: true,
          // Email + password + 6-digit OTP only — no magic-link / OAuth redirect,
          // so there is no token to parse out of the URL.
          detectSessionInUrl: false,
        },
        // All app data lives in the reforge schema (exposed to the API in the
        // Supabase dashboard). This is the default schema for .from() and .rpc().
        db: { schema: "reforge" },
      });
    });
  }
  return clientPromise;
}
