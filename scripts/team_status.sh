#!/usr/bin/env bash
# team_status.sh — one-shot dashboard for parallel team sessions.
#
# Lists every session in <cwd>/.claude/teams/<team>/<slug>/ with:
#   - evidence file count and total size
#   - last-modified evidence file (staleness signal)
#   - SYNTHESIS.md presence (closed vs in-flight)
#   - QUESTION.md first-line sub-question preview
#   - rough token attribution via file sizes (~ 3.5 bytes/token average for markdown)
#
# Scope model (v2.1): sessions are per-project. This script checks:
#   1. <cwd>/.claude/teams/ — per-project sessions (preferred)
#   2. ~/.claude/teams/     — legacy global sessions (fallback, shown with [global] tag)
#
# Usage:
#   team_status.sh                    # all teams, all sessions
#   team_status.sh research           # single team
#   team_status.sh research in-flight # in-flight only (no SYNTHESIS.md)
#
# No state, no daemon, no external deps beyond stat + awk. Exits 0 on completion.
set -uo pipefail


set -u

CWD_TEAMS_ROOT="$(pwd)/.claude/teams"
GLOBAL_TEAMS_ROOT="${HOME}/.claude/teams"
TEAM_FILTER="${1:-}"
STATE_FILTER="${2:-}"

# Build list of roots to scan: CWD first, then global (if different and exists)
ROOTS=()
if [[ -d "$CWD_TEAMS_ROOT" ]]; then
    ROOTS+=("$CWD_TEAMS_ROOT:local")
fi
if [[ -d "$GLOBAL_TEAMS_ROOT" && "$GLOBAL_TEAMS_ROOT" != "$CWD_TEAMS_ROOT" ]]; then
    ROOTS+=("$GLOBAL_TEAMS_ROOT:global")
fi

if [[ ${#ROOTS[@]} -eq 0 ]]; then
    echo "team_status: no teams dirs found (checked $CWD_TEAMS_ROOT and $GLOBAL_TEAMS_ROOT)"
    exit 0
fi

# Bytes-per-token rough proxy for markdown (empirically 3-4.5; use 3.5 midpoint).
# This is NOT a real tokenizer — it's a size-based approximation for dashboards.
BYTES_PER_TOKEN=3.5

format_bytes() {
    local b=$1
    if (( b < 1024 )); then
        printf "%5dB" "$b"
    elif (( b < 1048576 )); then
        awk -v b="$b" 'BEGIN { printf "%5.1fK", b/1024 }'
    else
        awk -v b="$b" 'BEGIN { printf "%5.2fM", b/1048576 }'
    fi
}

format_tokens() {
    local b=$1
    awk -v b="$b" -v bpt="$BYTES_PER_TOKEN" 'BEGIN {
        t = b / bpt
        if (t < 1000) printf "%5d", t
        else if (t < 1000000) printf "%5.1fk", t/1000
        else printf "%5.2fM", t/1000000
    }'
}

stat_mtime() {
    # Return mtime in epoch seconds. Works on GNU stat; BSD stat uses -f.
    stat -c %Y "$1" 2>/dev/null || stat -f %m "$1" 2>/dev/null || echo 0
}

age_human() {
    local now=$1
    local then=$2
    local delta=$(( now - then ))
    if (( delta < 60 )); then
        printf "%3ds" "$delta"
    elif (( delta < 3600 )); then
        printf "%3dm" "$((delta / 60))"
    elif (( delta < 86400 )); then
        printf "%3dh" "$((delta / 3600))"
    else
        printf "%3dd" "$((delta / 86400))"
    fi
}

now=$(date +%s)

printf "%-40s %-10s %-10s %-10s %-10s %-6s %-8s %-s\n" \
    "slug" "state" "ev_count" "ev_bytes" "~tokens" "age" "scope" "last-evidence"
printf '%s\n' "--------------------------------------------------------------------------------------------------------------------"

for root_entry in "${ROOTS[@]}"; do
    TEAMS_ROOT="${root_entry%%:*}"
    scope_tag="${root_entry##*:}"

for team_dir in "$TEAMS_ROOT"/*/; do
    [[ -d "$team_dir" ]] || continue
    team_name=$(basename "$team_dir")

    # Skip non-session entries (PROTOCOL.md dirs have no subdirs with sessions)
    # Skip non-research UUID team dirs unless explicitly asked
    if [[ "$team_name" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}- ]]; then
        [[ -z "$TEAM_FILTER" || "$TEAM_FILTER" == "$team_name" ]] || continue
    fi

    if [[ -n "$TEAM_FILTER" && "$TEAM_FILTER" != "$team_name" ]]; then
        continue
    fi

    for session_dir in "$team_dir"*/; do
        [[ -d "$session_dir" ]] || continue
        slug=$(basename "$session_dir")
        [[ "$slug" != "_archive" ]] || continue

        # State: closed (SYNTHESIS.md or CHARTER.md for engineering exists) vs in-flight
        if [[ -f "$session_dir/SYNTHESIS.md" || -f "$session_dir/CHARTER.md" ]]; then
            if [[ -f "$session_dir/SYNTHESIS.md" ]]; then
                state="closed"
            else
                state="in-flight"
            fi
        else
            state="in-flight"
        fi
        [[ -z "$STATE_FILTER" || "$STATE_FILTER" == "$state" ]] || continue

        # Evidence dir stats
        ev_dir="$session_dir/EVIDENCE"
        ev_count=0
        ev_bytes=0
        last_mtime=0
        last_file="-"

        if [[ -d "$ev_dir" ]]; then
            while IFS= read -r -d '' f; do
                ev_count=$((ev_count + 1))
                size=$(stat -c %s "$f" 2>/dev/null || stat -f %z "$f" 2>/dev/null || echo 0)
                ev_bytes=$((ev_bytes + size))
                mt=$(stat_mtime "$f")
                if (( mt > last_mtime )); then
                    last_mtime=$mt
                    last_file=$(basename "$f" .md)
                fi
            done < <(find "$ev_dir" -maxdepth 1 -name '*.md' -print0 2>/dev/null)
        fi

        if (( last_mtime > 0 )); then
            age=$(age_human "$now" "$last_mtime")
        else
            age="  -"
        fi

        printf "%-40s %-10s %-10s %-10s %-10s %-6s %-8s %-s\n" \
            "${slug:0:40}" \
            "$state" \
            "$ev_count" \
            "$(format_bytes $ev_bytes)" \
            "$(format_tokens $ev_bytes)" \
            "$age" \
            "$scope_tag" \
            "$last_file"
    done
done
done  # end roots loop

echo ""
echo "Note: ~tokens is a size-based approximation at $BYTES_PER_TOKEN bytes/token."
echo "      Real per-session token accounting is not exposed by Claude Code today."
echo "      Run 'python3 ~/.claude/scripts/audit_evidence.py <slug> -v' for detailed per-file metadata."
