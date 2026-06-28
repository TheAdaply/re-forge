// Runtime site config. Fetched (not bundled) from /site-config.json so the
// operator can drop real values at deploy time without a rebuild. The file holds
// ONLY non-secret values (the Supabase URL + the PUBLIC anon key); never a
// service-role key, a database connection string, or the master encryption key.

let cache;

export async function loadConfig() {
  if (cache) return cache;
  // BASE_URL is "/" for the custom-domain deploy (re-forge.theadaply.com); using
  // it keeps the fetch correct if the site is ever served from a sub-path.
  const res = await fetch(`${import.meta.env.BASE_URL}site-config.json`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`site-config.json failed to load (HTTP ${res.status})`);
  }
  cache = await res.json();
  return cache;
}
