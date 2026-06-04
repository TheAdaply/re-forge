<!-- Reference for the `ai-friendly-project` skill. Covers the runtime/web-service,
LLM-integration, frontend, privacy, concurrency, and ops surface that the eight code/docs
categories under-cover. This is the "does it actually run safely as a service" half.
Worked examples cite a real FastAPI+LLM repo (OSFL). -->

# Runtime, web services & LLM-integrated components

_Security, non-determinism, ops, frontend, privacy, and concurrency for any project that
runs as a service or calls an LLM_

**Overview:** The other eight references assume a backend *library* repo. The moment a
project is a **running service** (a FastAPI/Express app, a mounted dashboard, an
LLM-backed endpoint), a whole attack-and-failure surface opens that an evaluator who
*runs and probes the service* will score — and that a judge reading only test/lint config
will miss. That asymmetry is exactly why these rules belong in the skill: the genuine,
execution-grounded signals here (a probe that gets blocked, a `/healthz` that really
checks dependencies, an LLM response that fails closed on malformed JSON) are
ungameable and human-valued, while their absence is a real, demonstrable defect. Two
recurring honesty caveats apply throughout: (1) a *name* that suggests safety
(`sanitize_`, `/healthz`, an `aria-label`) with no real logic behind it is gaming a
shallow judge and is caught instantly by a prober or human; (2) for non-deterministic
LLM components, "make correctness executable" means record-replay / `temperature=0` /
a deterministic offline fallback exercised in CI — not skipping the tests.

## Rules

### 1. Lock down the HTTP surface: no wildcard CORS with credentials, authenticate or rate-limit every mutating endpoint, and never trust a request you didn't constrain. _[strong]_
- **Why:** `CORSMiddleware(allow_origins=["*"], allow_credentials=True)` is an OWASP-class misconfiguration that lets any origin make authenticated cross-site requests; an unauthenticated mutating endpoint (`POST`/`PATCH`/`DELETE`) is a write primitive for anyone on the network. A prober finds these in seconds; a reviewer who reads `app.py` finds them faster. These are real, falsifiable security defects, not judge artifacts.
- **How:** Set explicit allowed origins (a list, env-driven), and only enable `allow_credentials` with a non-wildcard origin list. Put auth (API key / session / OAuth) or at minimum rate-limiting (slowapi, an API gateway) in front of any state-changing route. Validate request bodies with a Pydantic model (`extra="forbid"` + `Field` constraints), and set a deliberate `response_model=` on every route so internal fields can't leak. Disable interactive `/docs` and `/openapi.json` in production if the API isn't public. Turn off debug tracebacks in prod (`FastAPI(debug=False)`) so stack traces don't leak to clients; add baseline security headers.
- **Example:**
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=settings.cors_origins,          # ["https://app.example.com"], never ["*"] with creds
      allow_credentials=True,
      allow_methods=["GET", "POST"],
  )

  @app.post("/api/goals", response_model=GoalOut)   # explicit out-model: no internal-field leak
  def create_goal(body: CreateGoal, _: None = Depends(require_api_key)):  # auth on the mutator
      ...
  ```
- **Sources:** OWASP API Security Top 10 (owasp.org/API-Security), FastAPI docs — CORS & security (fastapi.tiangolo.com)

### 2. Never serve a user-controlled path through `FileResponse`/`StaticFiles` without path-traversal containment. _[strong]_
- **Why:** Returning a file whose path is built from request input (`FileResponse(base / user_supplied)`) is the classic directory-traversal vulnerability (`../../etc/passwd`); `StaticFiles` mounted on a sensitive root leaks whatever is under it. This is a top-tier, deterministically-checkable web defect.
- **How:** Resolve the candidate path and verify it is contained: `resolved = (BASE / name).resolve(); if not resolved.is_relative_to(BASE.resolve()): raise HTTPException(404)`. Allowlist filenames where possible. Mount `StaticFiles` only on a dedicated, non-secret directory. Never interpolate request input into a filesystem path without this check.
- **Example:**
  ```python
  STATIC = Path("static").resolve()
  def safe(name: str) -> Path:
      p = (STATIC / name).resolve()
      if not p.is_relative_to(STATIC):        # blocks ../ traversal
          raise HTTPException(404)
      return p
  ```
- **Sources:** OWASP Path Traversal (owasp.org), Python `pathlib` docs (`Path.is_relative_to`)

### 3. Treat all LLM output as untrusted input: validate it through a typed schema, never `eval`/render/execute it raw, and isolate user text from system instructions. _[strong]_
- **Why:** A bare `json.loads(model_output)` into an untyped dict propagates wrong/malicious types into the engine; rendering model output into HTML is a stored-XSS sink; passing user free-text concatenated with system instructions is prompt injection. Model output is adversary-influenced (the user controls part of the prompt), so it gets the same boundary treatment as any external input — genuine defensive work, not gaming.
- **How:** Parse every LLM JSON response through a Pydantic model with `model_validate_json` so malformed output raises `ValidationError` at the edge. Keep user-supplied text in a *separate* message/role from system instructions; never string-concatenate untrusted text into the system prompt. Escape or sanitize any model output rendered into a UI. Constrain the model to a schema (function-calling / structured outputs) where the SDK supports it.
- **Example:**
  ```python
  class Decomposition(BaseModel):
      goals: list[Goal]
  # was: return json.loads(resp.choices[0].message.content or "{}")   # untyped, fails open
  return Decomposition.model_validate_json(resp_text)                  # typed, fails closed at the edge
  ```
- **Sources:** OWASP Top 10 for LLM Applications — LLM01 Prompt Injection, LLM05 Improper Output Handling (genai.owasp.org); Pydantic docs

### 4. Make the LLM layer testable: a deterministic offline fallback (or record-replay/`temperature=0`) that CI exercises with NO network and NO API key. _[strong]_
- **Why:** The skill's central thesis ("make correctness executable") silently excludes the headline feature if the LLM call is stochastic, paid, and network-dependent. A suite that needs a live key isn't hermetic — it can't run in CI and an evaluator can't reproduce it. The fix is standard test engineering: isolate the boundary.
- **How:** Put all LLM I/O behind one interface and inject it. In tests, use a recorded-response cassette (vcr.py / respx / a fixture) or a fake client; for paths that must hit logic, pin `temperature=0` and snapshot. Ship a deterministic offline mode (no key set → use a stub/echo client) and make CI run the suite in exactly that mode. Split `test_llm.py` (hermetic, always runs) from `test_llm_live.py` (opt-in, network, skipped by default).
- **Example:**
  ```python
  @pytest.fixture
  def client(monkeypatch):
      monkeypatch.delenv("OPENAI_API_KEY", raising=False)   # force offline
      return Orchestrator(llm=FakeLLM(canned=DECOMP_FIXTURE))
  # CI: `uv run pytest -q` passes with no key, no network.
  ```
- **Sources:** 12-Factor App — dev/prod parity (12factor.net); pytest fixtures & monkeypatch docs

### 5. Add timeouts, bounded retries, and a cost/rate guard on every outbound LLM/network call. _[strong]_
- **Why:** A `chat()` with no timeout can hang a request worker indefinitely; no retry means a transient 429/500 is a user-facing failure; no cost ceiling means a loop or large input can run up an unbounded bill. These are operational-honesty defects an evaluator running the service will hit.
- **How:** Set an explicit per-call timeout, retry transient errors with capped exponential backoff + jitter (tenacity / SDK built-ins), and bound max tokens/cost per request. Surface a clean error (not a 500 with a traceback) on exhaustion. Consider a circuit breaker so a downed dependency fails fast instead of saturating workers.
- **Example:**
  ```python
  @retry(stop=stop_after_attempt(3), wait=wait_exponential_jitter(initial=0.5, max=8),
         retry=retry_if_exception_type(RateLimitError | APITimeoutError))
  def chat(self, msgs):
      return self._client.chat.completions.create(model=self.model, messages=msgs,
                                                   timeout=20, max_tokens=1024)
  ```
- **Sources:** tenacity docs; OpenAI/Anthropic SDK retry & timeout guidance; release-it/circuit-breaker patterns

### 6. Render untrusted data safely in the frontend: no `x-html`/`innerHTML` on user/model content, separate vendored JS from app JS, and ship a real build. _[strong]_
- **Why:** A dashboard that binds user- or LLM-supplied strings into `Alpine x-html` or `element.innerHTML` is a DOM-XSS sink. Committing a 451 KB minified `tailwind.js` / 44 KB `alpine.min.js` blob next to app code mixes opaque third-party bytes with reviewable source. A web app's client code is half the project; a reviewer of a web app weights it.
- **How:** Bind text with `x-text` / `textContent`, never `x-html`/`innerHTML`, for anything not statically authored. If you must render HTML, sanitize with DOMPurify. Keep app JS (`app.js`) separate from vendored libs; prefer a pinned CDN with Subresource Integrity, or a build step that produces hashed bundles, over committing minified blobs. Add a Content-Security-Policy header.
- **Example:**
  ```html
  <!-- XSS sink (reject): --> <p x-html="goal.note"></p>
  <!-- safe:             --> <p x-text="goal.note"></p>
  <script src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.1/dist/cdn.min.js"
          integrity="sha384-..." crossorigin="anonymous" defer></script>
  ```
- **Sources:** OWASP XSS Prevention Cheat Sheet; MDN — Subresource Integrity; DOMPurify

### 7. Retain license + provenance for every vendored/bundled third-party asset, and pin its version + integrity. _[strong]_
- **Why:** Minified third-party code checked into the tree with stripped license headers is a real legal defect distinct from the repo's *own* `LICENSE`, and an unpinned opaque blob is non-reproducible and unauditable — a reviewer/agent can't verify what it is. License-detection tooling and careful reviewers flag both.
- **How:** For each vendored file keep the upstream license text/attribution (a `static/THIRD_PARTY_LICENSES` or per-file header) and record source URL + exact version + an integrity hash (SRI). Prefer a build step over committing minified blobs; if you must commit them, pin and document them. This is the genuine version of the project's own "license discipline" extended to dependencies you copy in.
- **Example:** `static/VENDORED.md`: `alpine.min.js — v3.14.1 — https://github.com/alpinejs/alpine — MIT — sha384-…`. Keep the MIT text in `static/THIRD_PARTY_LICENSES/alpinejs-MIT.txt`.
- **Sources:** SPDX license handling (spdx.dev); GitHub Licensee detection; SRI spec (w3.org)

### 8. Keep persisted/transmitted personal data minimal and deliberate: don't send PII to a third-party LLM without consent, and don't store it in plaintext you wouldn't ship. _[moderate]_
- **Why:** An app that persists user goals/personas to a plaintext `store.json` and forwards personal context to an external LLM API has a privacy surface the logging rule ("don't log PII") doesn't cover. Data minimization and consent are genuine, reviewable design properties (and legally material).
- **How:** Send the LLM only the fields it needs; redact identifiers where possible. State plainly what's persisted and what's transmitted (a short privacy note / `PRIVACY.md`). Encrypt or restrict the persisted store if it holds real PII; gitignore the runtime store (don't commit user data). Make external-LLM use opt-in where the data is personal.
- **Example:** Before the API call, strip direct identifiers: `payload = profile.model_dump(exclude={"email", "full_name"})`. Document: "Persona text is sent to OpenAI; no email/name is included."
- **Sources:** OWASP Top 10 — A02 Cryptographic Failures / sensitive-data exposure; data-minimization principle (GDPR Art. 5)

### 9. Make concurrency explicit for any shared mutable state under a multi-worker/async server. _[moderate]_
- **Why:** A single module-level `Store`/`Orchestrator` mutated on `POST`/`PATCH` handlers is shared across requests; under `uvicorn --workers N` it's *also* split across processes (so an in-process lock doesn't coordinate them), and under async it can interleave. Lost updates and torn reads are real correctness bugs the "functional core" rule doesn't address (it covers purity, not shell concurrency).
- **How:** Guard in-process shared state with a lock (`threading.Lock`) — good, but know it doesn't span processes; for multi-worker, move authoritative state to a store with atomic writes / transactions (SQLite WAL, Redis, Postgres) or run single-worker deliberately and document it. Make mutating operations idempotent where possible. Write the file store atomically (write temp + `os.replace`) so a crash mid-write can't corrupt it.
- **Example:** `tmp = path.with_suffix(".tmp"); tmp.write_text(json.dumps(data)); os.replace(tmp, path)  # atomic swap`. Document worker assumptions in `AGENTS.md`.
- **Sources:** Python `threading`/`os.replace` docs; SQLite WAL concurrency notes; 12-Factor — concurrency

### 10. Profile the real hot path before optimizing, but don't ship an obvious O(n) full-recompute on every mutation. _[moderate]_
- **Why:** Rewriting the *entire* JSON document on every single upsert (O(n) full-file write per mutation), or warm-simulating every goal at import time, are service-level inefficiencies distinct from micro-algorithmics — they degrade under load and a timeout-enforcing grader can fail them. "Measure before optimizing" still holds; this is about not designing in an obvious quadratic.
- **How:** For frequent mutations use an append/indexed store rather than full-document rewrite. Defer expensive warm-up out of import time (lazy or on first request). Prefer async handlers for I/O-bound work so a slow call doesn't block the worker. When you *do* optimize, justify with a benchmark and a truthful one-line complexity note — never an unbacked "optimized" comment.
- **Example:** Replace "load all → mutate → dump all" on every write with a keyed store (SQLite/`dbm`) or batched flush; move `simulate_all()` from module top-level into a cached first-call.
- **Sources:** Mercury efficiency benchmark (correctness ≠ efficiency); Knuth on premature optimization; `cProfile` docs

### 11. Ship a deployable artifact and a health/readiness endpoint that actually checks dependencies. _[moderate]_
- **Why:** "Does it run" for a service includes a documented start command, a pinned container/Procfile, an explicit host/port, and a health check an orchestrator (or evaluator) can poll. A `/healthz` that returns 200 unconditionally is presence-theater (the same family as the static badge); a real one verifies the store is writable and the LLM dependency is reachable/optional.
- **How:** Provide a one-command run (`uv run uvicorn app:app`) and a pinned Dockerfile/Procfile with an explicit `--host`/`--port` (don't bind `0.0.0.0` by default in dev). Add `/healthz` (liveness) and `/readyz` (readiness: store writable, deps reachable). Return graceful JSON errors, not raw tracebacks. Document required env/keys so a clean run doesn't fail on a missing var.
- **Example:**
  ```python
  @app.get("/readyz")
  def readyz():
      ok_store = store.writable()                      # actually checks, not just `return 200`
      return JSONResponse({"store": ok_store}, status_code=200 if ok_store else 503)
  ```
- **Sources:** Kubernetes liveness/readiness probe docs; 12-Factor — disposability/port-binding

### 12. Keep the working tree clean of runtime/generated artifacts, and handle dates/encoding correctly in a time-driven app. _[moderate]_
- **Why:** Committed `__pycache__/`, `.pytest_cache/`, or a runtime-mutated `data/store.json` are navigability noise and a hygiene tell distinct from secret-gitignoring. For a date-driven app (e.g. 90-day planning arcs), naive vs timezone-aware datetimes are a real correctness axis (off-by-a-day, DST bugs).
- **How:** Gitignore all caches, build output, and runtime state (`!.env.example` allowlist aside). Use timezone-aware datetimes (`datetime.now(tz=UTC)`), store ISO-8601 with offset, and read/write UTF-8 explicitly. Never commit generated data.
- **Example:** `.gitignore`: `__pycache__/`, `.pytest_cache/`, `data/store.json`. Code: `datetime.now(timezone.utc)`, never bare `datetime.now()` for stored timestamps.
- **Sources:** Python `datetime` aware-vs-naive docs; standard `.gitignore` conventions

### 13. Make an agent's runtime actions reviewable and reversible: dry-run, confirmation before destructive mutations, and an audit trail. _[moderate]_
- **Why:** For an LLM-orchestrated app that routes intents to *mutating* actions, "AI-agent navigability" should also cover making the agent's *changes* safe — distinct from helping the agent *find* code. Reversibility and an audit log are genuine operational-safety properties a careful reviewer values.
- **How:** Offer a dry-run/preview mode for destructive operations; require confirmation before irreversible store mutations; append an audit record (who/what/when/why) for agent-initiated changes; keep mutations idempotent and reversible where feasible.
- **Example:** `orchestrate(intent, dry_run=True)` returns the planned mutation without applying it; applied mutations append to an `audit.log` with the originating intent.
- **Sources:** human-in-the-loop agent design patterns; general operational-safety practice

## Checklist
- [ ] CORS is origin-explicit (no `*` with credentials); every mutating endpoint is authed or rate-limited
- [ ] Request bodies validated (Pydantic `extra="forbid"` + `Field`); every route has an explicit `response_model`
- [ ] No user-controlled filesystem path served without `is_relative_to(BASE)` containment; `StaticFiles` root is non-secret
- [ ] Debug tracebacks off in prod; baseline security headers (CSP, etc.) set
- [ ] LLM output parsed through a typed schema (`model_validate_json`), never rendered/executed raw; user text isolated from system prompt
- [ ] LLM suite is hermetic: passes in CI with no key and no network (offline fallback / cassette / `temperature=0`)
- [ ] Every outbound call has a timeout + bounded retry + cost/rate guard; failure returns a clean error, not a 500 traceback
- [ ] Frontend renders untrusted/model data with `x-text`/`textContent` (no `x-html`/`innerHTML`); vendored JS pinned with SRI or built, separate from app JS
- [ ] Vendored assets carry license/attribution + version + integrity hash
- [ ] PII minimized before external-LLM calls; persisted user data is gitignored and not plaintext-shipped; a privacy note exists
- [ ] Shared mutable state is lock-guarded (and process-safe, or single-worker documented); file writes are atomic
- [ ] No obvious O(n) full-recompute per mutation; expensive warm-up is lazy; I/O handlers are async where it matters
- [ ] One-command run + pinned container/Procfile + explicit host/port; `/healthz` + `/readyz` that actually check dependencies
- [ ] Working tree clean of caches/build/runtime state; timezone-aware datetimes; explicit UTF-8
- [ ] Agent-initiated destructive actions have dry-run/confirmation + an audit trail

## Anti-patterns
- `CORSMiddleware(allow_origins=["*"], allow_credentials=True)`, or an unauthenticated/unthrottled mutating endpoint — a write primitive for the whole network.
- `FileResponse(base / request.query.name)` with no containment — directory traversal; `StaticFiles` mounted on a secret-bearing root.
- `json.loads(model_output)` into an untyped dict, or rendering model/user text via `x-html`/`innerHTML` — fails-open type propagation and stored XSS.
- A test suite that needs a live API key / network to pass — non-hermetic; it can't run in CI and an evaluator can't reproduce it. (And the inverse gaming move: skipping the LLM tests entirely to get a green suite.)
- An outbound LLM/HTTP call with no timeout, no retry, no cost ceiling — hangs workers, surfaces transient errors to users, risks an unbounded bill.
- Committing 451 KB of minified vendor JS with stripped headers, unpinned, no integrity — opaque, non-reproducible, and a license defect.
- Persisting user PII to a plaintext committed store, or forwarding names/emails to an external LLM with no consent or minimization.
- Module-level mutable state mutated by handlers under `--workers N` with no cross-process coordination, or a non-atomic file write that corrupts on crash.
- A `/healthz` that returns 200 unconditionally, a Dockerfile on `:latest` with unpinned deps, or a "one-command run" that actually needs an undocumented key — presence-theater an evaluator that runs the service penalizes.
- Hollow accessibility: scattering `aria-*`/`role` attributes with no real semantics to pass an a11y checklist — a11y-theater, the same gaming pattern as authority comments. Use meaningful semantic HTML or omit it.
- Committed `__pycache__/`/`.pytest_cache/`/runtime `store.json`, and naive `datetime.now()` for stored timestamps in a date-driven app.
