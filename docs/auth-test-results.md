# Auth Edge Function — End-to-End Test Results

**Date:** June 19, 2026
**Tester:** Karan
**Project:** fedpulmkxjqoaxlanqhg
**Method:** `docs/test-auth.ps1` (PowerShell, Invoke-RestMethod, legacy anon key)

---

## Step 1 — DB columns on `users`

Required: `pin_hash`, `failed_pin_attempts`, `pin_locked_until`.
Migration: `supabase/migrations/20260616000001_ensure_pin_columns.sql` (idempotent).

| Column | Present? | Notes |
|--------|----------|-------|
| pin_hash | YES | Confirmed via SQL Editor June 16 |
| failed_pin_attempts | YES | Confirmed via SQL Editor June 16 |
| pin_locked_until | YES | Confirmed via SQL Editor June 16 |

**Step 1 result: PASS** — all three columns already present, no migration changes needed.

## Step 2 — send-otp

| Field | Value |
|-------|-------|
| Result | PASS |
| Response | HTTP 200 `{"success":true,"message":"OTP sent successfully"}`; OTP received on phone |

**Root cause of earlier failure:** the masked (hidden) key prompt mangled the long pasted anon key, producing an empty HTTP 400 from the Supabase gateway. Switching to visible paste + `.Trim()` fixed it. Scripts updated accordingly.

## Step 3 — verify-otp

| Field | Value |
|-------|-------|
| Result | PASS (after Option B rework) |
| user_id | a12d11e4-3e26-424f-a5b4-6a87108020c6 |
| is_new_user | true |
| role | parent |

Originally FAILED due to the MSG91/Supabase mismatch. Fixed via Option B (Supabase-native OTP + MSG91 Send SMS Hook). The code delivered matched the code Supabase generated, confirming MSG91 sends the supplied `otp`.

## Step 4 — create-pin

| Field | Value |
|-------|-------|
| Result | PASS |
| pin_hash is 64-char SHA-256 hex (not plaintext) | Assumed (response success); recommend a one-time DB spot-check |

## Step 5 — verify-pin

| Sub-test | Result | Notes |
|----------|--------|-------|
| Correct PIN (5678) | PASS | returned success + role=parent |
| Wrong PIN #1 | PASS | "Incorrect PIN. 2 attempts remaining." |
| Wrong PIN #2 | PASS | "Incorrect PIN. 1 attempts remaining." |
| Wrong PIN #3 | PASS | "Too many attempts. Account locked for 15 minutes." |

Lockout reset SQL (if re-testing): `UPDATE users SET failed_pin_attempts=0, pin_locked_until=NULL WHERE id='a12d11e4-3e26-424f-a5b4-6a87108020c6';`

---

## Issues / Observations

- **RESOLVED — OTP send/verify mismatch.** Fixed via Option B: Supabase generates/verifies the OTP; MSG91 delivers it through a Send SMS Auth Hook (`send-sms-hook`). Full flow verified end-to-end on June 19, 2026.
- **RESOLVED — verify-pin role source.** verify-pin now reads `role` from `public.users` (deployed June 19). Confirmed by setting the test user to `special_educator` and verifying verify-pin returned `special_educator`. Role-based routing is reliable for all roles.
- **PIN hash spot-check (optional).** create-pin succeeded; for full assurance run `SELECT pin_hash FROM users WHERE id='a12d11e4-3e26-424f-a5b4-6a87108020c6';` and confirm it is a 64-char hex string, not `5678`.

### Final status: All steps PASS (June 19, 2026). Phone + PIN auth is functional end-to-end.

## Known code note (pre-test)

- `verify-pin` reads `role` from `auth` user metadata (`getUserById(...).user.user_metadata.role`), whereas `verify-otp` reads `role` from the `public.users` table. If roles live only in `public.users`, `verify-pin` may return the default `parent` regardless of the real role. Flag for review if the test shows a role mismatch.
