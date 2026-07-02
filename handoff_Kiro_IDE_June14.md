# V-SPED 1.0 — Kiro IDE Handoff Document

**Created:** June 14, 2026
**IDE:** Kiro (Claude Opus 4.8)
**Developer:** Karan Karthik Palukuri
**Project:** V-SPED for Vathsalya Child Neuro and Nurture Center
**Repo:** jvvenkat1304/VSPED1.0 (branch: main)

> This is a living document. It is updated automatically as work progresses in this session.

---

## Plan Changes (June 14, 2026)

### Authentication scope reduced — OAuth dropped

- **Google OAuth is being dropped.** It will no longer be used for login or account creation.
- **Apple OAuth is being dropped.** It will no longer be used for login or account creation.
- Authentication is now **phone number only** (via MSG91 OTP + PIN), with **email as an optional field**.

**Reason:** Simplifying the authentication surface for V-SPED 1.0. Phone OTP + PIN is the primary and only sign-in path. Email is captured optionally (e.g., for notifications or account recovery) but is not a login method.

**Impact on prior documentation:**
- The OAuth provider setup sections in `AUTH_SETUP by Kiro - June 13th` (Google Cloud Console, Apple Developer Portal) are now **out of scope** and should be treated as deprecated.
- The "Phase 2: OAuth Providers" work in the earlier handoff is **cancelled**.

---

## Current Authentication Model

| Method | Status | Notes |
|--------|--------|-------|
| Phone number + OTP (MSG91) | Active | Primary sign-up / sign-in path |
| 4-digit PIN | Active | Created on first login, used for returning logins |
| Email | Optional | Captured as optional profile field, not a login method |
| Google OAuth | Dropped | No longer in scope |
| Apple OAuth | Dropped | No longer in scope |

---

## Backend Components (as inherited from prior sessions)

| Component | Status |
|-----------|--------|
| Database schema (26 tables) | Complete |
| RLS security policies | Complete |
| send-otp edge function | Deployed & tested (SMS delivery confirmed) |
| verify-otp edge function | Deployed (untested end-to-end) |
| create-pin edge function | Deployed (untested end-to-end) |
| verify-pin edge function | Deployed (untested end-to-end) |
| MSG91 integration | Working (OTP template VSPED_OTP active) |

---

## Reference Data (consolidated from archived handoffs)

The detailed source documents were moved to `docs/archive/` on June 14, 2026. The essential structural data is preserved below so this single document carries full project context.

### Project / Environment

| Item | Value |
|------|-------|
| Supabase Project ID | fedpulmkxjqoaxlanqhg |
| Region | ap-south-1 (Mumbai) |
| Supabase Base URL | https://fedpulmkxjqoaxlanqhg.supabase.co |
| Supabase Dashboard | https://app.supabase.com/project/fedpulmkxjqoaxlanqhg |
| GitHub Repo | https://github.com/jvvenkat1304/VSPED1.0 (branch: main, auto-deploy from `supabase/`) |
| FlutterFlow Project | https://app.flutterflow.io/project/v-sped-e13q69 |
| Vathsalya Website | https://vathsalya.vercel.app |
| OS / Shell | Windows / PowerShell (pwsh) |
| Edge Function runtime | Deno / TypeScript, deployed via Supabase CLI |

### Edge Function URLs

| Function | URL |
|----------|-----|
| send-otp | https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/send-otp |
| verify-otp | https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/verify-otp |
| create-pin | https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/create-pin |
| verify-pin | https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/verify-pin |

### MSG91 (SMS / OTP)

| Item | Value |
|------|-------|
| Dashboard | https://control.msg91.com |
| OTP Template Name | VSPED_OTP |
| OTP Template ID | 6a2e64e8e83b471d6e06a853 |
| OTP API endpoint | https://control.msg91.com/api/v5/otp |
| Sender IDs | VATHAI, VNEUAI |
| Secrets in Supabase | MSG91_AUTH_KEY, MSG91_TEMPLATE_ID (MSG91_SENDER_ID set but unused — sender handled by OTP template) |

> Note: MSG91 has two **separate** template systems — SMS Templates and OTP Templates. They are NOT interchangeable. The OTP API only works with an OTP-section template ID.

### Database — Structural Summary

- **26 total tables** (17 added across prior migrations + 9 original), 60+ RLS policies, 12 triggers, 50+ indexes.
- **6 user roles:** `parent`, `special_educator`, `school_admin`, `school_teacher`, `admin`, `manufacturer`.

**Key table groups:**
- Marketplace (4): `educator_profiles`, `educator_offerings`, `reviews`, `platform_transactions`
- Schools (5): `schools`, `school_teachers`, `classrooms`, `school_students`, `classroom_enrollments`
- Games (3): `educational_games`, `custom_games`, `game_progress`
- Device/Tokens (3): `tablets`, `educator_tokens`, `token_transactions`
- Financial (2): `school_subscriptions`, `manufacturer_royalties`

**Auth-related columns on `users`:**
- `pin_hash` — SHA-256 hash of the 4-digit PIN (plain text never stored)
- `failed_pin_attempts INTEGER DEFAULT 0` — added for lockout tracking
- `pin_locked_until TIMESTAMPTZ DEFAULT NULL` — added for lockout tracking
- `role` (default `parent`), `phone`, `email`, `full_name`

**Trigger:** `handle_new_user` (fires `on_auth_user_created`) — auto-creates a `public.users` row when a new `auth.users` record is created, copying id/phone/email and defaulting role to `parent`.

### Auth Flow (current — phone only)

1. Phone entry → calls `send-otp` with `{ phone: "91XXXXXXXXXX" }`
2. OTP entry → calls `verify-otp` → returns `is_new_user`, `user_id`, `role`, `session_token`
3. If `is_new_user: true` → PIN creation → calls `create-pin`
4. If `is_new_user: false` → PIN entry → calls `verify-pin`
5. On success → read `role` → route to matching dashboard

**Dashboard routing by role:** parent → Parent Dashboard; special_educator → Educator Dashboard; school_admin → School Admin Panel; school_teacher → Teacher Dashboard; admin → Admin Dashboard; manufacturer → Manufacturer Portal.

### Security Specs

- **OTP:** 6 digits, 5-minute expiry. (Rate limiting / per-OTP attempt caps not yet implemented.)
- **PIN:** 4 digits, SHA-256 hashed. Max 3 failed attempts → 15-minute lockout via `pin_locked_until`. Success resets `failed_pin_attempts` to 0.

### Key Learnings / Gotchas

- In PowerShell, use `Invoke-RestMethod` for API testing — bash-style `curl` quoting does not work the same.
- Edge Functions require the **legacy anon key** (`eyJ...`) in the Authorization header, NOT the new `sb_publishable_...` key. Find it under Settings → API → "Legacy anon, service_role API keys".
- `WARNING: Docker is not running` during `supabase functions deploy` is harmless — Docker is only needed for local testing; server deploys succeed regardless.
- Direct PostgreSQL connection (port 5432) from outside Supabase is blocked; the pooler defaults to IPv6 while the dev network is IPv4-only. Use the browser SQL Editor instead.

---

## Completion Snapshot (as of June 19, 2026)

Estimate of overall progress. Approximate and weighting-dependent; recorded for planning.

**"Business logic"** = three-pronged model operations (marketplace booking, enrollment + parent approval, educator token economy, school subscription billing, games/progress, manufacturer royalties, platform fees) plus Razorpay payments, VideoSDK sessions, notifications, and scheduled jobs.

| Layer | Status | Rough weight (whole product) |
|-------|--------|------|
| Database schema (26 tables, incl. business tables) | Done | ~15% |
| RLS security | Done | ~10% |
| Auth backend (OTP + PIN + Send SMS Hook + roles) | Done & tested | ~8% |
| Auth UI wiring in FlutterFlow | Pending (sheet ready) | ~7% |
| App shell, navigation, role-based dashboard skeletons | Pending | ~10% |
| Business-logic backend | Not started (debated) | ~25% |
| Business-logic UI | Not started | ~25% |

- **If everything except business logic is completed:** ~**35–40% of the total product**.
- **Backend/technical layer only (excluding FlutterFlow UI):** ~**65–70%** complete, since the data model + security are fully built and auth is done/tested.
- Headline: foundation is solid and the DB is already shaped for the business logic, but business logic + its UI is more than half the actual product.

---

## Activity Log

Entries are added here automatically as work is performed in this session.

| Date / Time | Action | Details |
|-------------|--------|---------|
| June 14, 2026 | Document created | Created this handoff doc and recorded the decision to drop Google and Apple OAuth; auth is now phone + optional email. No code changes made yet. |
| June 14, 2026 | Created auto-update hook | Added agentStop Agent Hook "Update Handoff Log" (id: update-handoff-log) that appends Activity Log entries to this document automatically after meaningful changes. |
| June 14, 2026 | Consolidated reference data & archived legacy docs | Added "Reference Data" section to this doc (project IDs/URLs, edge function URLs, MSG91 details, DB structural summary, auth flow, security specs, gotchas). Moved 3 legacy files (AUTH_SETUP by Kiro - June 13th, handoff by Claude - June 14th 1500 hours.js, Handoff document by Kiro - chat 1 - June 13th) into docs/archive/. Root now holds only README.md and this handoff doc. |
| June 16, 2026 | Prepped auth end-to-end test | Created supabase/migrations/20260616000001_ensure_pin_columns.sql (idempotent add of pin_hash, failed_pin_attempts, pin_locked_until), docs/test-auth.ps1 (interactive E2E test script; anon key read masked, never persisted), and docs/auth-test-results.md (results template). Flagged a pre-test code note: verify-pin reads role from auth user_metadata while verify-otp reads it from public.users — possible role mismatch to review after test. Live OTP round-trip pending user run (needs phone + key). |
| June 16, 2026 | Auth test Step 1 PASS | Verified via Supabase SQL Editor that users table has all three columns (pin_hash, failed_pin_attempts, pin_locked_until). No migration changes needed. Recorded in docs/auth-test-results.md. Steps 2-5 pending user run of docs/test-auth.ps1. |
| June 16, 2026 | send-otp returned 400; added diagnostic | Step 2 (send-otp) failed with HTTP 400; original script did not capture the response body (older PowerShell hides it). Created docs/diag-send-otp.ps1 to print full status + body for send-otp. Awaiting user re-run to capture the actual error message. |
| June 16, 2026 | Diagnosed 400 as gateway rejection; added key-format check | diag-send-otp.ps1 showed HTTP 400 with EMPTY body for a correct request body ({"phone":"919515827853"}). Empty 400 = Supabase gateway rejecting before reaching function, most likely wrong anon key format (new sb_ key instead of legacy eyJ JWT). Added a safe key-prefix/length check to docs/diag-send-otp.ps1 (prints only first 4 chars + length, never the secret). Awaiting re-run to confirm key format. |
| June 16, 2026 | Switched diagnostic to visible key input | Changed docs/diag-send-otp.ps1 to read the anon key with plain (visible) Read-Host instead of masked SecureString, to rule out paste truncation/newline issues mangling a long key. Added .Trim() to strip stray whitespace. Awaiting re-run. |
| June 16, 2026 | Auth test Step 2 PASS (send-otp) | send-otp returned HTTP 200 {"success":true,...} and OTP was received on phone. Root cause of earlier 400: masked key prompt mangled the pasted anon key. Updated docs/test-auth.ps1 to use visible key paste + .Trim() and to capture full error bodies (PS 5.1 response stream). Recorded in docs/auth-test-results.md. Steps 3-5 pending full test-auth.ps1 run. |
| June 19, 2026 | Found verify-otp architecture mismatch; chose Option B | Step 3 (verify-otp) FAILED ("Invalid or expired OTP"). Root cause: send-otp generated OTP via MSG91 while verify-otp validated via Supabase Auth — two systems with no shared OTP state, so it fails every time. Decision (Karan): Option B — Supabase-native OTP with MSG91 as delivery via a Send SMS Auth Hook. (Note: prior log entries mislabeled June 16 were actually this same testing effort; real date is June 19.) |
| June 19, 2026 | Implemented Option B (Supabase-native OTP + MSG91 hook) | Created supabase/functions/send-sms-hook/ (index.ts + deno.json) — verifies Standard Webhooks signature via SEND_SMS_HOOK_SECRET and delivers Supabase's OTP through MSG91 (passes custom otp to existing OTP template). Reworked send-otp to call supabase.auth.signInWithOtp (E.164 normalization). Reworked verify-otp to verify via anon client (returns real session + refresh_token) and read profile via service-role client. Registered send-sms-hook in config.toml (verify_jwt=false). Deployed send-sms-hook to project fedpulmkxjqoaxlanqhg. Pending: user dashboard config (enable Phone auth, register Send SMS Hook, set SEND_SMS_HOOK_SECRET), then deploy send-otp/verify-otp and re-test. Risk to validate: MSG91 OTP API must send the supplied otp, not generate its own. |
| June 19, 2026 | verify-pin role fix CONFIRMED | Ran docs/test-verify-pin.ps1 after setting test user role to special_educator; verify-pin returned role=special_educator (PASS). Role-based routing now reliable for all roles. Marked resolved in docs/auth-test-results.md. Auth system (phone OTP + PIN + lockout + role) fully tested and working end-to-end. Security note: user pasted the anon key in chat — anon key is low-risk (client-safe with RLS), no rotation needed; advised keeping service_role key and SEND_SMS_HOOK_SECRET private. |
| June 19, 2026 | Created FlutterFlow auth wiring sheet | Created docs/flutterflow-auth-wiring.md: copy-transcribe build sheet for connecting existing FlutterFlow auth pages — App State vars, 4 API Library calls (send-otp/verify-otp/create-pin/verify-pin) with exact URLs, headers, JSON bodies, and response paths. Pages already exist per user; sheet covers wiring only. |
| June 19, 2026 | Secured API_KEYS.txt + added .gitignore + completion snapshot | User added plaintext API_KEYS.txt to project root (untracked, never committed). Created .gitignore (excludes API_KEYS.txt, .env, *.key, *.pem, supabase/.temp/, .vscode/, node_modules) and confirmed via git check-ignore. Advised moving the keys file outside the repo. Added "Completion Snapshot" section to this doc: ~35-40% of whole product if all-but-business-logic done; ~65-70% of backend-only layer. Backend/hook layer considered done & dusted; business logic still being debated. |
| June 19, 2026 | Frontend strategy decided: eject to Flutter code (Option 3) | After reviewing FlutterFlow Developer Menu options and docs, confirmed FlutterFlow code export is one-way (no round-trip back to visual builder; Refactor/YAML is find-replace only, not page authoring). Decision (Karan): eject to Flutter code and have Kiro build/maintain the UI in code; visual polish will be done via code + live preview, not the canvas. Plan: code must live inside VSPED1.0 (e.g. frontend/) for Kiro access; preview via Flutter web (Chrome); Download Code may need paid FF plan. Build auth screens first (no business logic needed), feature screens after management answers. Brand assets pending from user (logo, hex colors, fonts); offered to pull palette from vathsalya.co.in. |
| June 19, 2026 | Created business-logic questions doc | Created docs/business-logic-questions.md for management: 13 areas (roles/onboarding, parents/booking, educator token economy, school licensing, classrooms/parent-approval, games, devices/royalties, payments/Razorpay, video/sessions, notifications, admin, compliance/DPDP, monetization) with numbered questions tagged [BLOCKER]/[SOON] and a highest-priority blockers shortlist. |

---

## Pending / Next Steps

- No tasks started yet — awaiting go-ahead from developer before making code changes.
