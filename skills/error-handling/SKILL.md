---
name: error-handling
description: Use this skill in re-forge when designing error types, adding retries/circuit breakers for unreliable dependencies, reviewing API endpoints for missing error handling, building user-facing error messages, or debugging silent failures and cascading errors. Covers typed errors, the Result pattern, error boundaries, and retries across TypeScript, Python, and Go.
---

# Error Handling Patterns

Consistent, robust error handling for production code.

## When to activate

- Designing error types / exception hierarchies for a module or service
- Adding retry logic or circuit breakers for unreliable external dependencies
- Reviewing API endpoints for missing error handling
- Implementing user-facing error messages
- Debugging cascading failures or silent error swallowing

## Core principles

1. **Fail fast and loudly** — surface errors at the boundary where they occur.
2. **Typed errors over string messages** — errors are first-class values with structure.
3. **User messages ≠ developer messages** — friendly text to users, full context in server logs.
4. **Never swallow errors silently** — every `catch` must handle, re-throw, or log.
5. **Errors are part of your API contract** — document every error code a client may receive.

## TypeScript

Define a typed error hierarchy and standardize the API envelope:

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 500,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = this.constructor.name
    Object.setPrototypeOf(this, new.target.prototype) // fix instanceof under transpilation
  }
}
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) { super(`${resource} not found: ${id}`, 'NOT_FOUND', 404) }
}
export class ValidationError extends AppError {
  constructor(msg: string, details: { field: string; message: string }[]) { super(msg, 'VALIDATION_ERROR', 422, details) }
}
```

**Result pattern** for expected-failure operations (parsing, external calls) — return `{ ok: true, value } | { ok: false, error }` instead of throwing, so callers must handle both branches.

**Central API handler** — map `AppError` → its `statusCode`, validation errors → 422 with field details, and everything else → log full detail server-side and return a generic 500 envelope `{ error: { code, message } }`.

**React** — wrap render trees in an `ErrorBoundary` (`getDerivedStateFromError` + `componentDidCatch`) with a fallback UI and an `onError` reporter.

## Python

Mirror the hierarchy with a base `AppError(message, code, status_code)` and subclasses (`NotFoundError`, `ValidationError`). Register framework exception handlers (e.g. FastAPI `@app.exception_handler`) that map `AppError` to its status and a generic handler that logs the full exception and returns a generic 500.

## Go

Use sentinel errors (`var ErrNotFound = errors.New("not found")`) and wrap with context (`fmt.Errorf("querying user %s: %w", id, err)`) so the original is never lost. At the handler, `errors.Is` to map domain errors to HTTP status codes; log and return generic 500 for the default case.

## Retry with exponential backoff

Retry only retriable errors (transient/5xx, not 4xx). Use `maxAttempts` (e.g. 3), exponential delay with jitter, and a `maxDelay` cap, then re-throw the last error if all attempts fail.

## User-facing messages

Map error codes to friendly text (`NOT_FOUND → "The requested item could not be found."`, `RATE_LIMITED → "Too many requests. Please wait a moment."`). Keep stack traces and internal detail out of anything a user sees.

## Checklist (before merging code that touches error handling)

- [ ] Every `catch` handles, re-throws, or logs — no silent swallowing
- [ ] API errors follow the standard envelope `{ error: { code, message } }`
- [ ] User-facing messages contain no stack traces or internal detail
- [ ] Full error context logged server-side
- [ ] Custom errors extend a base `AppError` with a `code` field
- [ ] Async functions surface errors to callers — no fire-and-forget without fallback
- [ ] Retry logic only retries retriable errors (not 4xx)
- [ ] React components wrapped in `ErrorBoundary` for rendering errors
