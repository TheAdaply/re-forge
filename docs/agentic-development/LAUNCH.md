# YC Session Launch Playbook

Run this in the order shown. Total prep time before pasting the prompt: **~5 minutes**.

## Pre-flight (do once, no rush)

```bash
# 1. Confirm claude-forge is installed (should be, from prep session)
ls ~/.claude/agents/research | wc -l   # should be 19+
ls ~/.claude/agents/engineering | wc -l   # should be 14+

# 2. Confirm gpucheck shallow clone is reachable for the prompt
ls /tmp/yc-recon/claude-forge/agents/security-team | head    # should list security-* agents

# If /tmp got cleared (it can on reboot), re-clone:
mkdir -p /tmp/yc-recon
git clone --depth 1 git@github.com:Akasxh/claude-forge.git /tmp/yc-recon/claude-forge

# 3. Get a real local clone of gpucheck (the YC session works in this)
mkdir -p ~/Code
git clone git@github.com:Akasxh/gpucheck.git ~/Code/gpucheck   # if not already cloned
cd ~/Code/gpucheck
git fetch origin
git checkout main
git pull
```

## Mac comfort settings (recommended for 6-hour run)

```bash
# Keep the laptop awake for 6h while plugged in
caffeinate -dimsu -t 23400 &   # 6.5 hours; kill on session end

# Sanity check power
pmset -g batt    # confirm "AC Power"
```

Close Slack, browsers, and other heavy apps. Keep the lid open (some Macs throttle GPU when closed).

## Pre-install ALL claude-forge teams (CRITICAL — fixes the v1 defect)

This must run before `claude` starts. Mid-session installs are not picked up by the subagent registry.

```bash
SRC=/tmp/yc-recon/claude-forge/agents
DST=~/.claude/agents

# 1. Copy security/testing/docs team specialists into the registered location
for team in security-team testing-team docs-team; do
  short=$(echo $team | sed 's/-team$//')
  mkdir -p "$DST/$short" "$HOME/.claude/teams/$short"
  cp "$SRC/$team"/*.md "$DST/$short/" 2>/dev/null
  cp "$SRC/$team/PROTOCOL.md" "$HOME/.claude/teams/$short/PROTOCOL.md" 2>/dev/null
done

# 2. Promote the 10 gpucheck expert personas to real subagents
EXPERT_SRC=~/Code/gpucheck/.claude/experts
EXPERT_DST=~/.claude/agents/gpucheck
mkdir -p "$EXPERT_DST"
for f in "$EXPERT_SRC"/*/AGENT.md; do
  name=$(basename "$(dirname "$f")")
  identity=$(grep -A1 "^## Identity" "$f" | tail -1 | head -c 200)
  { echo "---"
    echo "name: $name"
    echo "model: opus"
    echo "effort: max"
    echo "description: $identity"
    echo "---"
    echo
    cat "$f"
  } > "$EXPERT_DST/$name.md"
done

# 3. Verify counts (do not launch claude if any team is short)
echo "=== team population ==="
for t in research engineering security testing docs gpucheck; do
  printf "  %-15s %d agents\n" "$t:" "$(ls ~/.claude/agents/$t 2>/dev/null | wc -l)"
done
echo "expected: research≥19  engineering≥14  security≥14  testing≥13  docs≥9  gpucheck=10"
```

If any count is 0 or below the expected minimum, **stop and re-run** before pasting the prompt.

## Create the release branch

```bash
cd ~/Code/gpucheck
git checkout -b release/v1.0
git push -u origin release/v1.0    # so the orchestrator can open PRs against it later

# v2 also requires these dependencies pre-installed (so Phase 0 doesn't waste time downloading)
uv pip install -e ".[dev,torch]"
uv pip install hypothesis pytest-cov mutmut
python -c "import torch; print('mps:', torch.backends.mps.is_available())"   # must print True
```

## Optional: TestPyPI credentials (so Phase 4 can auto-upload)

If you want the orchestrator to do the TestPyPI upload itself instead of stopping for you, set up `~/.pypirc`:

```
[testpypi]
  username = __token__
  password = pypi-<your-testpypi-token>
```

Get a TestPyPI token at https://test.pypi.org/manage/account/token/.

If you skip this, the orchestrator will leave the built wheel/sdist in `~/Code/gpucheck/dist/` and instruct you to run `python -m twine upload --repository testpypi dist/*` yourself in Phase 4. This is fine and arguably safer.

## Launch the YC session

```bash
cd ~/Code/gpucheck
claude
```

When the prompt appears, **paste the full contents of `MEGA_PROMPT_v2.md`** (use v2, not v1 — see `PROMPT_DELTA.md` for why) and press Enter.

That's it. The orchestrator handles everything else from Phase 0 onward.

## During the session — your job is mostly to NOT interrupt

- Watch the parallel dispatches in your terminal. The transcript will show several `Agent` tool calls per message — that's intended.
- The Stop hook (installed by claude-forge `setup.sh`) will fire when the orchestrator finishes; that's fine.
- If you see something obviously dangerous (an unexpected `git push origin main`, a real PyPI upload, etc.), interrupt with Ctrl-C and challenge it. The prompt forbids these, so it shouldn't happen.
- If your Mac fan ramps loud — that's fine, it means the GPU is being exercised. Power adapter, lid open.
- If a swarm worker hangs, you can kill it: `pgrep -f "claude -p" | xargs kill`. Tier-3 is best-effort; the gate only requires "26 RESULTS files exist," which the swarm orchestrator will retry to satisfy.

## After the session ends

```bash
# 1. Locate the session JSONL
ls -lt ~/.claude/sessions/*.jsonl | head -3

# 2. Read the auto-generated report
open /Users/cero/Desktop/yc-session/SESSION_REPORT.md

# 3. Verify the deliverables
ls ~/Code/gpucheck/dist/                     # wheel + sdist + dashboard.html
cat ~/Code/gpucheck/CHANGELOG.md | head -50
gh pr list --repo Akasxh/gpucheck            # release/v1.0 → main PR
gh pr list --repo Akasxh/claude-forge        # release/v0.2-rc → main PR
gh issue list --repo pytorch/pytorch --author Akasxh --state open  # filed bugs

# 4. Submit to YC: bundle the .jsonl + SESSION_REPORT.md + the two PR URLs.
```

If anything looks off, do not merge the PRs. Investigate first. The session is recoverable.

## Knobs you can tune in MEGA_PROMPT.md before pasting

(Edit the file in your editor before launching if you want to change any of these.)

| What | Where in MEGA_PROMPT.md | Default |
|---|---|---|
| Number of kernel targets in the swarm | Section 2, Tier-3 list | 26 |
| Per-swarm-worker iteration count | Section 2, Bash command template | 250 |
| Per-swarm-worker timeout | Section 2, "Keep the run under 8 minutes" | 8 min |
| Upstream issue filing cap | Section 8 / Phase 3 step 3 | 3 |
| Forge skill cap (Phase 1) | Phase 1 step 4 | 3 |
| TestPyPI upload behavior | Phase 4 step 1 | best-effort |
| Phase end times | Phase 0/1/2/3/4 headers | 0:20 / 1:30 / 4:30 / 5:15 / 6:00 |

## Recovery

If the session crashes or you have to stop early, the work is durable on disk:

- Every team's `.claude/teams/<team>/v1.0/` directory has TURN_LOG, EVIDENCE/, and partial outputs.
- All worktrees are real git branches.
- Restart by `claude` in `~/Code/gpucheck` and paste:
  > "Resume the YC session. Read `~/Code/gpucheck/.claude/teams/SESSION_PRECHECK.md` and the most recent `LOG.md` files in each team directory. Identify which phase we were in and continue from the last gate. Do not re-run completed phases."
