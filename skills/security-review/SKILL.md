---
name: security-review
description: Use this skill whenever you add authentication or authorization, handle user input or file uploads, work with secrets or credentials, create API endpoints, implement payment or blockchain features, or store/transmit sensitive data in re-forge. It provides a comprehensive security checklist and the secure patterns to follow. Activate on any phrase like "add auth", "handle this upload", "new API route", "store this token", or "is this secure".
---

# Security Review

Ensure code follows security best practices and surfaces vulnerabilities before they ship. One vulnerability can compromise the whole platform — when in doubt, err on the side of caution.

## When to activate
- Implementing authentication or authorization
- Handling user input or file uploads
- Creating API endpoints, or integrating third-party APIs
- Working with secrets, payments, or sensitive data

## Checklist by area

### 1. Secrets management
- No hardcoded API keys, tokens, or passwords — read all secrets from environment variables and assert they exist at startup.
- Keep `.env*` files in `.gitignore`; verify no secrets are in git history.
- Store production secrets in the hosting platform's secret manager, never in source.

### 2. Input validation
- Validate ALL user input with a schema (e.g. zod) before processing; use whitelists, not blacklists.
- Restrict file uploads by size, MIME type, AND extension.
- Never feed raw user input into queries or commands; ensure error messages don't leak internals.

### 3. Injection prevention
- Use parameterized queries / query builders / ORM bindings exclusively — never string-concatenate SQL or shell commands.
- Verify any dynamically built query path is sanitized.

### 4. Authentication & authorization
- Store tokens in `HttpOnly; Secure; SameSite=Strict` cookies — never `localStorage` (XSS-exposed).
- Perform an authorization/role check BEFORE every sensitive operation.
- Enable Row Level Security (or equivalent) so users can only read/write their own rows.

### 5. XSS prevention
- Sanitize any user-provided HTML before rendering (allowlist tags/attrs).
- Configure a strict Content Security Policy; avoid `'unsafe-inline'` / `'unsafe-eval'` (treat them as temporary, documented debt).
- Rely on framework auto-escaping; avoid unvalidated dynamic HTML.

### 6. CSRF protection
- Require CSRF tokens on state-changing requests; set `SameSite=Strict` on cookies.

### 7. Rate limiting
- Rate-limit all endpoints (IP- and user-based); apply stricter limits to expensive operations (search, exports, auth).

### 8. Sensitive data exposure
- Never log passwords, tokens, card data, or PII — redact (log `last4`, `userId`, not secrets).
- Return generic error messages to users; log detailed errors/stack traces only server-side.

### 9. Blockchain (if applicable)
- Verify wallet signatures, validate transaction recipient/amount, check balances before transacting — never sign blindly.

### 10. Dependency security
- Run the audit tool (`npm audit` etc.), fix known vulnerabilities, commit lock files, and install with `npm ci` in CI for reproducible builds.

## Security testing
Add automated tests that assert: unauthenticated requests get 401, under-privileged requests get 403, invalid input gets 400, and rate limits return 429 under burst load.

## Pre-deployment hard gate
Before any production deploy, confirm: secrets in env • inputs validated • queries parameterized • user content sanitized • CSRF on • secure token handling • role checks in place • rate limiting on • HTTPS enforced • security headers (CSP, X-Frame-Options) set • no sensitive data in errors or logs • dependencies clean • RLS enabled • CORS scoped • uploads validated • wallet signatures verified (if blockchain).

## Resources
- OWASP Top 10 (`owasp.org/www-project-top-ten`)
- Web Security Academy (`portswigger.net/web-security`)
