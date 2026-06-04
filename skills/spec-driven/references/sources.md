# Sources & prior art

This skill teaches a methodology assembled from public prior art. The *ideas*
below are not copyrightable; this skill's text, templates, and ID scheme are
original to re-forge. Nothing here is copied from any source.

## Cited prior art

- **GitHub Spec Kit** — an open-source toolkit for "spec-driven development"
  that makes specifications the executable artifact agents build from. Closest
  public sibling to this skill's workflow.
  <https://github.com/github/spec-kit>

- **EARS — Easy Approach to Requirements Syntax** — Alistair Mavin's public
  requirements-authoring method (`WHEN <trigger> THE SYSTEM SHALL <response>`
  and related patterns), developed at Rolls-Royce. This skill's requirement
  sentences follow EARS.
  <https://alistairmavin.com/ears/>

- **Architecture Decision Records (ADRs)** — Michael Nygard's pattern for
  recording the *why* behind significant technical choices as small,
  version-controlled documents. This skill folds ADR-style rationale into the
  design artifact.
  <https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions>

## Related work (methodology only — no text reused)

- **`dana0550/spec-system`** — a community "contract-first specs for
  long-horizon AI delivery" workflow. Its README displays an MIT *badge*, but
  GitHub detects no `LICENSE` file in the repository, so no license grant
  exists. We therefore reuse **none** of its text, templates, or file contents;
  we cite it only as a methodological sibling and describe general ideas.
  <https://github.com/dana0550/spec-system>

## In-repo companion

- **`agents/EDD-ADDENDUM.md`** — re-forge's Eval-Driven Development addendum.
  Spec-driven development is the *contract* counterpart to EDD's *evidence*
  discipline: specs say what to build, EDD evals say how you know it is good.
