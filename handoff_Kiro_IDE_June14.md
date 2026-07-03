# V-SPED 1.0 — Project Handoff & Development Log

**Last Updated:** July 2, 2026
**Started:** June 14, 2026
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

## Backend Components — Current Status (updated June 19, 2026)

| Component | Status |
|-----------|--------|
| Database schema (26 tables) | Complete |
| RLS security policies | Complete |
| send-otp edge function | Complete & tested (Supabase-native OTP, MSG91 delivery via hook) |
| verify-otp edge function | Complete & tested (returns real session, is_new_user, role) |
| create-pin edge function | Complete & tested (SHA-256 hash confirmed in DB) |
| verify-pin edge function | Complete & tested (correct PIN, 3-strike lockout, role from public.users) |
| send-sms-hook edge function | Complete & deployed (Send SMS Auth Hook for Supabase → MSG91) |
| MSG91 integration | Working (OTP template VSPED_OTP, SEND_SMS_HOOK_SECRET set) |
| Google OAuth | Dropped — out of scope |
| Apple OAuth | Dropped — out of scope |

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
| June 14, 2026 | Session started; OAuth dropped; handoff doc created | Switched to Kiro IDE. Dropped Google and Apple OAuth — auth now phone OTP + PIN only, email optional. Created this handoff doc and agentStop auto-update hook. |
| June 14, 2026 | Consolidated reference data & archived legacy docs | Added full Reference Data section (project IDs, URLs, MSG91 details, DB structural summary, auth flow, security specs, gotchas). Archived 3 legacy handoff files to docs/archive/. |
| June 15, 2026 | Auth E2E test infrastructure prepared | Created supabase/migrations/20260616000001_ensure_pin_columns.sql (idempotent). Created docs/test-auth.ps1 (interactive E2E test script) and docs/auth-test-results.md (results template). Pre-noted verify-pin role-source mismatch risk. |
| June 16, 2026 | Auth test Step 1 PASS — DB columns confirmed | Verified via Supabase SQL Editor: pin_hash, failed_pin_attempts, pin_locked_until all present on users table. No migration needed. |
| June 17, 2026 | send-otp HTTP 400 — diagnosed and fixed | Step 2 failed with empty HTTP 400 (gateway rejection). Created docs/diag-send-otp.ps1. Root cause: masked key input (Read-Host -AsSecureString) mangling pasted anon key. Switched to visible input + .Trim(). send-otp returned HTTP 200, OTP delivered to phone. Updated test-auth.ps1 with same fix. |
| June 18, 2026 | Discovered OTP architecture mismatch; chose Option B | verify-otp returned "Invalid or expired OTP" — send-otp used MSG91 to generate the OTP but verify-otp checked Supabase Auth (two systems, no shared state). Chose Option B: Supabase-native OTP with MSG91 as delivery via Send SMS Auth Hook. |
| June 18, 2026 | Implemented Option B — send-sms-hook created | Created supabase/functions/send-sms-hook/ (Standard Webhooks signature verification + MSG91 delivery of Supabase-generated OTP). Reworked send-otp to call supabase.auth.signInWithOtp (E.164 normalization). Reworked verify-otp to use anon client (real session + refresh_token). Deployed send-sms-hook. |
| June 19, 2026 | Supabase dashboard configured; all functions redeployed | User enabled Phone auth, registered Send SMS Hook (send-sms-hook URL), set SEND_SMS_HOOK_SECRET in Supabase secrets. Deployed updated send-otp and verify-otp. |
| June 19, 2026 | Full auth flow PASS end-to-end | All steps passed: send-otp (200), verify-otp (real session, is_new_user=true, role=parent), create-pin (SHA-256 hash confirmed in DB), verify-pin correct (success), verify-pin wrong x3 (lockout triggered correctly). MSG91 custom-otp delivery confirmed. |
| June 20, 2026 | verify-pin role fix — deployed and confirmed | Fixed verify-pin to read role from public.users instead of auth user_metadata (was always returning default 'parent'). Deployed. Confirmed: set test user to special_educator, verify-pin returned special_educator. Role routing reliable for all roles. |
| June 21, 2026 | Security hardening — .gitignore created | User added API_KEYS.txt to project root (untracked). Created .gitignore (API_KEYS.txt, .env, *.key, *.pem, supabase/.temp/, .vscode/, node_modules). Confirmed via git check-ignore. Advised moving keys file outside the repo. |
| June 22, 2026 | Completion snapshot + FlutterFlow wiring sheet | Added Completion Snapshot section to handoff (~35-40% total, ~65-70% backend-only). Created docs/flutterflow-auth-wiring.md: App State vars + 4 API Library call specs (exact URLs, headers, JSON bodies, response paths). |
| June 23, 2026 | Frontend strategy decision — eject to Flutter code | Reviewed FlutterFlow Developer Menu options and docs. Confirmed code export is one-way. Decision (Karan): eject to Flutter/Dart, Kiro builds and maintains all UI. Preview via Flutter web (Chrome). FlutterFlow → GitHub on 'flutterflow' branch to keep separate from main. Build auth screens first, feature screens after business logic clarified. |
| June 24, 2026 | Business logic questions doc created | Created docs/business-logic-questions.md for management: 13 areas, numbered questions tagged [BLOCKER]/[SOON], priority blockers shortlist (token economy, school pricing, booking model, payment split, parent approval, minor consent, NeuroBridge arch). |
| June 25, 2026 | NeuroBridge architecture decision recorded | Games → integrated into V-SPED (uses existing educational_games/game_progress tables). Assessment engine → separate entity, connected via API. Captured 4 open architecture questions needing management answers. |
| June 26, 2026 | FlutterFlow page inventory documented | Confirmed existing FlutterFlow pages: ParentDashboard group (17 pages incl. PhoneEntryPage, OTPVerificationPage, SetPINPage, PinEntryPage, OptionalEmailPage, StarterPage, etc.) and SpecialEducatorDashboard. StarterPage has Google/Apple buttons to be removed. Wiring sheet updated accordingly. |
| June 27, 2026 | Handoff doc sections updated; Backend Components table finalised | Updated Backend Components table to reflect all 5 edge functions as Complete & Tested. Updated auth model table (OAuth rows marked Dropped). Began preparing Flutter SDK setup steps for Windows. |
| June 28, 2026 | All backend work committed and pushed to GitHub | Committed 27 files (edge functions, config.toml, migration, docs, .gitignore, handoff) to origin/main. Commit cbdd118. API_KEYS.txt absent (gitignore confirmed). Instructed user to connect FlutterFlow → GitHub → branch 'flutterflow'. |
| July 1, 2026 | Handoff doc major update | Updated title + last-updated date. Added NeuroBridge section, Frontend Strategy section. Replaced stale Pending/Next Steps with ordered actionable list. Clarified FlutterFlow code push must be done by user via Developer Menu. |
| July 2, 2026 | Handoff doc fully updated and pushed to GitHub | Updated title, last-updated date, backend components, NeuroBridge section, frontend strategy, pending/next steps. Committed and pushed to origin/main. |
| July 3, 2026 | README rewritten + final pre-handoff push | Replaced empty README.md with full project context: overview, tech stack, repo structure, auth flow summary, current status table, secrets guide, pointer to handoff doc. Committed (f53c6d9) and pushed to origin/main. All context files confirmed current for next session. |

---

## NeuroBridge — Architecture Decision (July 1, 2026)

NeuroBridge is a connected but distinct product segment covering interactive games and assessments.

**Scope split (decided June 19):**
- **Interactive games** → integrated INTO V-SPED (same app, same repo). Games are part of the V-SPED frontend, tied to the existing `educational_games`, `custom_games`, and `game_progress` tables in the database.
- **Assessment engine** → a **separate entity**. Connected to V-SPED (shared user identity, shared data where relevant) but architecturally separate — its own codebase, potentially its own Supabase project or schema, communicating with V-SPED via API.

**Open questions (to clarify with management before building):**
- What does "connected but different" mean for auth? Does a V-SPED session token grant access to the assessment side, or does the user log in separately?
- Does assessment data live in the V-SPED Supabase project (separate schema/tables) or a completely separate Supabase project?
- Which roles have access to assessments (parents, educators, school teachers, all)?
- Is the assessment engine to be built now or deferred?

**Immediate impact on current work:** None — the games integration goes into the existing DB tables and frontend. The assessment separation is a future architectural task.

---

## Frontend Strategy (decided June 19, 2026; confirmed July 1, 2026)

- **Ejecting from FlutterFlow to Flutter code.** FlutterFlow's code export is one-way (no round-trip back to the visual canvas). All UI work from this point forward is done in Flutter/Dart code by Kiro.
- **Preview:** via Flutter web (Chrome) — hot-reload, no emulator needed.
- **Code location:** must live inside `K:\V-SPED\VSPED1.0\frontend\` for Kiro to access and edit.
- **FlutterFlow existing pages:** to be copied out of FlutterFlow (Developer Menu → Download Code) and placed in `frontend/`. A paid FlutterFlow plan may be required.
- **FlutterFlow → GitHub branch:** FlutterFlow's built-in GitHub integration pushes to a `flutterflow` branch (NOT `main`) to keep FF code separate from the Supabase backend on `main`.
- **Build order:** auth screens first (backend fully done), feature screens after business logic is clarified.
- **Brand assets pending:** logo file, hex color codes, font — user to provide; palette can also be pulled from vathsalya.co.in.

---

## Pending / Next Steps (as of July 1, 2026)

**Immediate (can start now, no business logic needed):**
1. User to connect FlutterFlow → GitHub via Developer Menu → Connect GitHub Repo → target branch `flutterflow`.
2. Download FlutterFlow code and extract into `VSPED1.0\frontend\`.
3. Install Flutter SDK on Windows (for local web preview via Chrome).
4. Provide brand assets (logo, colors, font) or confirm Kiro pulls them from vathsalya.co.in.
5. Remove Google/Apple login buttons from StarterPage and LoginPage in FlutterFlow (manual, 2 minutes).
6. Kiro builds Flutter auth screens (StarterPage, PhoneEntry, OTPVerification, SetPIN, PinEntry) against the live backend.

**Waiting on management (business logic clarification document: `docs/business-logic-questions.md`):**
7. Token economy definition (Q3.1–3.4) — blocks educator marketplace screens.
8. School pricing model (Q4.1–4.2) — blocks school admin screens.
9. Parent booking unit + payment timing (Q2.2–2.3) — blocks booking flow screens.
10. Razorpay payment split / merchant of record (Q8.2) — blocks all payment flows.
11. Parent approval + minor data consent model (Q5.1, Q5.3, Q12.1) — blocks enrollment screens.
12. NeuroBridge assessment architecture (auth model, data location, role access) — blocks assessment build.

**Deferred (later phase):**
- Razorpay payment integration
- VideoSDK video session integration
- Notification system (push, email provider)
- Scheduled jobs
- NeuroBridge assessment engine (separate entity)
