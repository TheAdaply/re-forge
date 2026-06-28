#!/usr/bin/env python3
"""Mint an org join-code (rfj_...) — the ADMIN tool that gates site signup.

re-forge site signup REQUIRES a valid, unused org code. An admin runs this once per
new teammate (or once per org, with --max-uses), hands them the printed code, and that
code is what binds their verified Supabase account to the right org (db/migrations/
0014_site_auth.sql: handle_supabase_auth_signup consumes it at email-verify and creates
their named, org-scoped reforge.app_users row).

This is the same mint as services/ingest/app/orgauth.mint_join_code — same crypto
(secrets.token_urlsafe(32) + sha256), same row shape — just runnable from a laptop with
no API server, for bootstrapping and out-of-band invites. It stores ONLY the sha256
hash + a non-secret rfj_ prefix and prints the plaintext EXACTLY ONCE.

Env
---
DATABASE_URL is read from ~/.reforge/db.env (the owner/service connection; the same
file services/ingest/app/config.py and the other scripts source). org_join_codes is
NOT under RLS (it is looked up by hash before the tenant is known), so a direct owner
INSERT is correct here. The secret is never printed beyond the one plaintext line.

Usage
-----
    # mint a single-use member code for an existing org (by id or unique name)
    uv run --with 'psycopg[binary]' scripts/mint-org-code.py --org-id <uuid>
    uv run --with 'psycopg[binary]' scripts/mint-org-code.py --org-name "Acme"

    # admin code, 5 uses, expires in 14 days, labelled
    ... scripts/mint-org-code.py --org-id <uuid> --role admin --max-uses 5 \
        --expires-in-days 14 --label "design team invite"

    # bootstrap the FIRST org (chicken-and-egg): create the org AND its first code
    ... scripts/mint-org-code.py --create-org "Acme" --role admin
    # then: the founder signs up with the printed code -> becomes an admin app_user;
    #       promote them once via:  update reforge.app_users set role='owner'
    #                               where org_id='<uuid>' and supabase_uid='<auth uid>';

Exit codes: 0 = minted; 2 = bad arguments / org not found; 1 = DB error.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import secrets
import sys
import uuid
from datetime import datetime, timedelta, timezone


def log(msg: str) -> None:
    """One logging path so output is greppable and ordering is deterministic."""
    print(f"[mint-org-code] {msg}", flush=True)


def _load_env(path: str = "~/.reforge/db.env") -> bool:
    """Load KEY=VALUE lines from *path* into os.environ if not already set.

    Mirrors scripts/mergeguard_integration._load_env: tolerant of `export ` prefixes,
    `#` comments, and quotes; never overrides a value already in the environment (so a
    one-off `DATABASE_URL=... mint-org-code.py` still wins). Returns False if absent.
    """
    p = os.path.expanduser(path)
    if not os.path.exists(p):
        return False
    with open(p, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip().removeprefix("export ")
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return True


def _expiry(days: int | None) -> datetime | None:
    """Optional --expires-in-days -> an absolute UTC timestamp (None = no expiry).

    A non-positive value means no expiry, never an error — mirrors orgauth._expiry.
    """
    if not days or days <= 0:
        return None
    return datetime.now(timezone.utc) + timedelta(days=days)


def _norm_role(role: str | None) -> str:
    """member | admin only. Refuses 'owner' so an invite can never mint a rival owner
    and break the 0004 one-owner-per-org invariant (the DB CHECK enforces the same)."""
    r = (role or "member").strip().lower()
    if r == "owner":
        raise ValueError("cannot mint an owner join-code (promote a member to owner instead)")
    if r not in ("member", "admin"):
        raise ValueError("role must be 'member' or 'admin'")
    return r


def _resolve_org(cur, args) -> tuple[str, str]:
    """Return (org_id, org_name) for the target org, creating it for --create-org.

    Exactly one of --org-id / --org-name / --create-org is required (enforced by the
    caller). Raises LookupError (-> exit 2) on a missing or ambiguous org.
    """
    if args.create_org:
        cur.execute(
            "insert into reforge.orgs (name) values (%s) returning id, name",
            (args.create_org,),
        )
        oid, oname = cur.fetchone()
        log(f"created org {oname!r} ({oid})")
        return str(oid), oname

    if args.org_id:
        try:
            uuid.UUID(args.org_id)
        except (ValueError, TypeError):
            raise LookupError(f"--org-id {args.org_id!r} is not a valid uuid")
        cur.execute("select id, name from reforge.orgs where id = %s", (args.org_id,))
        row = cur.fetchone()
        if row is None:
            raise LookupError(f"no org with id {args.org_id}")
        return str(row[0]), row[1]

    # --org-name: must resolve to exactly one org.
    cur.execute("select id, name from reforge.orgs where name = %s order by id", (args.org_name,))
    rows = cur.fetchall()
    if not rows:
        raise LookupError(f"no org named {args.org_name!r}")
    if len(rows) > 1:
        ids = ", ".join(str(r[0]) for r in rows)
        raise LookupError(f"{len(rows)} orgs named {args.org_name!r}; use --org-id (one of: {ids})")
    return str(rows[0][0]), rows[0][1]


def mint(cur, org_id: str, role: str, *, label: str | None, max_uses: int | None,
         expires_at: datetime | None, created_by: str | None) -> dict:
    """Insert one rfj_ join-code for *org_id* and return its plaintext + metadata.

    Same crypto + row shape as orgauth.mint_join_code: a 256-bit code, stored ONLY as
    its sha256 hash (unique) plus a non-secret 12-char prefix. The plaintext is in the
    return and is shown to the operator exactly once.
    """
    code = "rfj_" + secrets.token_urlsafe(32)
    code_hash = hashlib.sha256(code.encode()).hexdigest()
    cur.execute(
        "insert into reforge.org_join_codes "
        "(org_id, code_hash, code_prefix, grant_role, created_by, label, max_uses, expires_at) "
        "values (%s, %s, %s, %s, %s, %s, %s, %s) returning id",
        (org_id, code_hash, code[:12], role, created_by, label, max_uses, expires_at),
    )
    code_id = cur.fetchone()[0]
    return {
        "id": str(code_id),
        "join_code": code,
        "prefix": code[:12],
        "grant_role": role,
        "max_uses": max_uses,
        "expires_at": expires_at.isoformat() if expires_at else None,
    }


def _parse_args(argv: list[str]) -> argparse.Namespace:
    ap = argparse.ArgumentParser(
        prog="mint-org-code.py",
        description="Mint an org join-code (rfj_...) that gates re-forge site signup.",
    )
    target = ap.add_mutually_exclusive_group(required=True)
    target.add_argument("--org-id", help="UUID of an existing org to mint for")
    target.add_argument("--org-name", help="name of an existing org (must be unique)")
    target.add_argument("--create-org", metavar="NAME",
                        help="create a new org with this name and mint its first code (bootstrap)")
    ap.add_argument("--role", default="member", choices=("member", "admin"),
                    help="role the redeemer receives (default: member; never owner)")
    uses = ap.add_mutually_exclusive_group()
    uses.add_argument("--max-uses", type=int, default=1, metavar="N",
                      help="redemptions allowed before the code is exhausted (default: 1)")
    uses.add_argument("--unlimited", action="store_true",
                      help="no redemption cap (max_uses = NULL)")
    ap.add_argument("--expires-in-days", type=int, default=None, metavar="D",
                    help="expire the code D days from now (default: no expiry)")
    ap.add_argument("--label", default=None, help="non-secret note shown in the codes roster")
    ap.add_argument("--created-by", default=None, metavar="UUID",
                    help="app_user id to attribute the mint to (default: NULL)")
    return ap.parse_args(argv)


def main(argv: list[str]) -> int:
    args = _parse_args(argv)

    try:
        role = _norm_role(args.role)
    except ValueError as e:
        log(f"ERROR: {e}")
        return 2

    if args.unlimited:
        max_uses: int | None = None
    elif args.max_uses is not None and args.max_uses < 1:
        log("ERROR: --max-uses must be >= 1 (use --unlimited for no cap)")
        return 2
    else:
        max_uses = args.max_uses
    expires_at = _expiry(args.expires_in_days)

    _load_env()  # populate DATABASE_URL from ~/.reforge/db.env if not already set
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        log("ERROR: DATABASE_URL is not set (expected in ~/.reforge/db.env or the environment)")
        return 2

    import psycopg  # lazy: arg parsing + helpers are importable without a driver

    try:
        conn = psycopg.connect(database_url)
    except Exception as e:  # connection problems should be a clear, non-crashing error
        log(f"ERROR: could not connect to the database: {e}")
        return 1

    try:
        with conn.cursor() as cur:
            try:
                org_id, org_name = _resolve_org(cur, args)
            except LookupError as e:
                conn.rollback()
                log(f"ERROR: {e}")
                return 2
            result = mint(cur, org_id, role, label=args.label, max_uses=max_uses,
                          expires_at=expires_at, created_by=args.created_by)
        conn.commit()
    except Exception as e:
        conn.rollback()
        log(f"ERROR: mint failed (rolled back): {e}")
        return 1
    finally:
        conn.close()

    # The ONE place the plaintext is shown — store it now, it is not recoverable.
    print()
    print(f"  org        {org_name}  ({org_id})")
    print(f"  role       {result['grant_role']}")
    print(f"  max uses   {'unlimited' if max_uses is None else max_uses}")
    print(f"  expires    {result['expires_at'] or 'never'}")
    print(f"  prefix     {result['prefix']}")
    print()
    print(f"  JOIN CODE  {result['join_code']}")
    print()
    print("  ^ give this to the new teammate. It is shown ONCE and stored only as a")
    print("    sha256 hash — re-run to mint another if it is lost.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
