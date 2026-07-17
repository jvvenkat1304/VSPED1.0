# V-SPED Progress Tracker

**Goal:** A working, functioning app ready for initial customers, funding demo, and scalable infrastructure.
**Last Updated:** July 17, 2026

---

## Overall Progress: ████████████████ ~85%

| Milestone | Progress | Status |
|-----------|----------|--------|
| Phase 1: Backend Core | 100% | ✅ DONE |
| Phase 1b: RCI Verification | 100% | ✅ DONE |
| Phase 2: Mobile Frontend | 100% | ✅ DONE |
| Phase 3: Razorpay Payments | 100% | ✅ DONE |
| Phase 4: VideoSDK | 100% | ✅ DONE |
| Phase 5: E2E Testing | 55% | 🔄 7 critical bugs FIXED (commit 4dab557) + 6 runtime bugs FIXED (auth/routing) + 95/104 SonarQube issues fixed, pending two-phone test |
| Phase 6: Demo Polish + EAS Build | 10% | 🔄 Brand colors done |
| Phase 7: AWS/Cloudflare Migration | 0% | ⬜ Post-testing |
| Phase 8: App Store Deployment | 0% | ⬜ Final step |

---

## Phase 1: Backend Core ✅ COMPLETE (June 13 – July 5)

| Task | Status |
|------|--------|
| Database schema (26+ tables) | ✅ |
| RLS security policies (60+) | ✅ |
| Auth: Phone OTP + PIN + 5-strike lockout | ✅ Tested |
| Auth: Send SMS Hook (Supabase → MSG91) | ✅ Tested |
| Consent system: AES-256 encrypted child data | ✅ Tested |
| Consent: request/respond/revoke flow | ✅ Tested |
| Educator profiles + subscription system | ✅ Deployed |
| Session scheduling (propose/respond) | ✅ Deployed |
| Rate limiting (PostgreSQL sliding window) | ✅ Active |
| Security: 37/37 core + 7/7 advanced tests PASS | ✅ |
| Supply chain: all esm.sh imports pinned @2.49.1 | ✅ |
| DPDP Act 2023 privacy policy | ✅ |
| Immutable child-data steering rule | ✅ Active |
| handle_new_user trigger (auto-creates public.users) | ✅ Recreated Jul 13 |

---

## Phase 1b: RCI Verification System ✅ COMPLETE (July 7-8)

| Task | Status |
|------|--------|
| CRR format validator (14 RCI categories: SE, AST, CP, RP, PO, SHT, CBR, RCA, MRT, RSW, RPMR, OMS, HEMT, RET) | ✅ |
| Self-attestation declaration + legal text | ✅ |
| Multi-stage lifecycle: pending → provisionally_verified → verified/rejected | ✅ |
| verify-rci (rate limited 3/60min, format check, duplicate check, attestation gate, audit log) | ✅ |
| create-educator-profile (sets verification_status='pending', min_rate_inr support) | ✅ |
| admin-verify-educator (GET queue + POST verify/reject with audit trail) | ✅ |
| verification_audit_log table (append-only, service_role only) | ✅ |
| Updated RLS: marketplace visibility requires verification + subscription | ✅ |
| Frontend: attestation checkbox, error handling (429/409/403/400) | ✅ |
| Frontend: verification badges (green ✓ RCI Verified / amber ⏳ Pending) | ✅ |

---

## Phase 2: Mobile Frontend ✅ COMPLETE (July 5-14)

**Stack:** React Native 0.81 + Expo SDK 54 + Expo Router + TypeScript + Zustand

### Auth Flow
| Screen | Status |
|--------|--------|
| StarterPage → session check → PIN or Get Started | ✅ |
| Phone entry (+91, 10-digit validation) | ✅ |
| OTP verify (6-box, autofill, auto-submit) | ✅ |
| Set PIN (custom numpad, confirm flow) | ✅ |
| PIN entry (auto-verify on 4th digit, lockout) | ✅ |
| Role selection (parent/educator) | ✅ |
| Session persistence (SecureStore + Zustand) | ✅ |
| Role-based routing (educator → educator dashboard) | ✅ |

### Parent Screens
| Screen | Status |
|--------|--------|
| Parent dashboard (Home tab) with all cards wired | ✅ |
| Find Educators (live Supabase query, badges) | ✅ |
| Educator profile detail (full profile + Propose Sessions) | ✅ |
| ProposalBottomSheet (child selector, stepper, cost calc, soft warning) | ✅ |
| My Proposals (status badges, counter comparison, payment CTA) | ✅ |
| Consent Management (view/revoke active grants) | ✅ |
| Child Profile (decrypted via get-child, add child form) | ✅ |
| Notifications (feed + mark read + bell icon) | ✅ |
| Settings (user info, logout, manage PIN stub) | ✅ |

### Educator Screens
| Screen | Status |
|--------|--------|
| Educator dashboard (Home tab) with live status bar | ✅ |
| My Profile (read-only: RCI, subjects, rate, verification, subscription) | ✅ |
| My Clients (active consent grants) | ✅ |
| Proposals Inbox (accept/reject/counter with inline form) | ✅ |
| Sessions (upcoming/past with Start/Rejoin video buttons) | ✅ |
| Subscription Checkout (Razorpay Payment Link, verify on refresh) | ✅ |
| Offerings (day toggles, time, recommended weeks, notes + view/edit modes) | ✅ |
| Settings (same as parent) | ✅ |

### Shared Screens
| Screen | Status |
|--------|--------|
| Classroom tab (sessions + video join, role-aware) | ✅ |
| Calendar tab (7-day selector, session list by day) | ✅ |
| Role-based bottom nav (different tabs per role) | ✅ |

### Architecture
| Component | Status |
|-----------|--------|
| Zustand auth store (sessionToken, userId, role, children) | ✅ |
| SecureStore persistence + rehydration on launch | ✅ |
| Role-based tab layout (_layout.tsx reads role from store) | ✅ |
| Supabase client with auth headers throughout | ✅ |

---

## Phase 3: Razorpay Payments ✅ COMPLETE (July 13-14)

| Task | Status |
|------|--------|
| Razorpay test mode keys configured | ✅ |
| subscribe-educator (Payment Links API, returns checkout URL) | ✅ |
| razorpay-webhook (HMAC-SHA256 signature verification) | ✅ |
| create-payment-order (Payment Link for session payments) | ✅ |
| verify-subscription (polls Razorpay API directly on refresh) | ✅ |
| Frontend: opens checkout in browser, pending state, pull-to-refresh | ✅ |
| Webhook configured: payment.captured, payment_link.paid, order.paid | ✅ |
| Test: subscription payment successful (test mode) | ✅ |
| Migration: razorpay_columns added to all relevant tables | ✅ |

**Key decisions:**
- Subscriptions API not available on account → one-time Payment Links for annual subscription
- Webhook delivery unreliable → verify-subscription endpoint as primary activation mechanism
- Native Razorpay SDK deferred to Phase 6 (EAS Build required)

---

## Phase 4: VideoSDK ✅ COMPLETE (July 14)

| Task | Status |
|------|--------|
| VideoSDK account created + API key + Secret set | ✅ |
| create-video-session edge function (JWT gen, room creation, session status) | ✅ |
| VideoSession component (join/rejoin/end, browser-based for Expo Go) | ✅ |
| Educator: Start/Rejoin Session buttons on accepted sessions | ✅ |
| Parent: Join Session button on active sessions | ✅ |
| Session lifecycle: accepted → in_progress (when video starts) → completed (when ended) | ✅ |
| Classroom tab: central hub for sessions + video | ✅ |

**Key decisions:**
- Prebuilt VideoSDK UI in browser (Expo Go compatible)
- Native SDK (`@videosdk.live/react-native-sdk`) deferred to Phase 6 (EAS Build required)
- Recording feature paused per meeting decision

---

## Phase 5: E2E Testing ⬜ NEXT (estimated 3-5 days)

Two-phone testing (your phone as educator, uncle's phone as parent):

| Task | Status | Notes |
|------|--------|-------|
| Create test educator profile (your number) | ⬜ | Already done during Razorpay testing |
| Parent sign-up → add child (uncle's phone) | ⬜ | |
| Parent finds educator in search | ⬜ | Requires educator verified + subscribed |
| Parent proposes sessions | ⬜ | ProposalBottomSheet → create-proposal |
| Educator receives proposal notification | ⬜ | |
| Educator accepts proposal | ⬜ | Auto-consent + payment created |
| Parent pays for sessions | ⬜ | Razorpay Payment Link |
| Sessions appear in Classroom/Calendar | ⬜ | |
| Video session (both join) | ⬜ | VideoSDK prebuilt in browser |
| Educator ends session → marked completed | ⬜ | |
| Parent revokes consent | ⬜ | Educator loses access immediately |
| Counter-proposal flow | ⬜ | Educator counters, parent accepts/withdraws |
| Proposal expiry (72h) | ⬜ | Verify expire_stale_proposals function |
| Rate limiting (OTP, verify-rci, proposals) | ⬜ | |
| Property-based tests (20 deferred from specs) | ⬜ | RCI + session proposal correctness properties |
| Health check / diagnostics endpoint | ⬜ | |
| Security regression (re-run 44 tests) | 🔄 | SonarQube full scan: 0 issues on all 27 backend files |

---

## Phase 6: Demo Polish + EAS Build (estimated 1 week)

| Task | Status | Notes |
|------|--------|-------|
| **EAS Build setup** | ⬜ | **CRITICAL** — unlocks native SDKs. Replaces Expo Go. |
| Native VideoSDK (`@videosdk.live/react-native-sdk`) | ⬜ | In-app video — no browser. Requires EAS Build. |
| Native Razorpay (`react-native-razorpay`) | ⬜ | In-app payment — no browser. Requires EAS Build. |
| Child profile — Instagram-style view | ⬜ | School, notes, progress, milestones |
| Child profile — edit/delete functionality | ⬜ | |
| Parent/Educator profile edit screen | ⬜ | |
| Branding pass (splash screen, app icon) | ⬜ | Logo already in assets |
| Onboarding tutorial / walkthrough | ⬜ | |
| Loading/empty states with branded illustrations | ⬜ | |
| Error messages — all human-friendly | 🔄 | Auth errors done |
| Push notifications (expo-notifications + FCM) | ⬜ | |
| OTA updates (expo-updates) | ⬜ | |
| Demo script (3-minute funding pitch) | ⬜ | |
| Web build (Expo Router → Vercel for instant demos) | ⬜ | |

---

## Phase 7: AWS/Cloudflare Migration (estimated 2-4 weeks)

**Purpose:** Demonstrate to investors that the platform is ready to scale beyond managed services. Shows infrastructure maturity and control.

### Migration Plan

| Current (Supabase) | Target (AWS) | Effort | Risk |
|---------------------|-------------|--------|------|
| PostgreSQL (Supabase-hosted) | AWS RDS PostgreSQL (ap-south-1) | Low — schema/RLS identical, just connection string change | Low |
| Edge Functions (Deno, 20+ functions) | AWS Lambda (Node.js) + API Gateway | **High** — all functions need Deno→Node.js port | Medium |
| Supabase Auth (phone OTP) | AWS Cognito + SNS (or keep MSG91) | **High** — different auth API, token format, session management | High |
| PostgREST (auto-generated REST) | Custom API layer (Express/Fastify) or keep PostgREST as standalone | **High** — frontend queries tables directly via PostgREST | Medium |
| Supabase Realtime | Not used currently | N/A | None |
| File Storage | AWS S3 | Future (when file uploads added) | Low |

| Current (Expo/Vercel) | Target (Cloudflare) | Effort | Risk |
|------------------------|--------------------| --------|------|
| Web build (Expo Router) | Cloudflare Pages | **Low** — just deployment target, zero code change | None |
| Static assets | Cloudflare CDN | **Low** — automatic with Pages | None |
| API proxy (if needed) | Cloudflare Workers | Medium — if we need edge middleware | Low |

### Migration Tasks

| Task | Status | Notes |
|------|--------|-------|
| Set up AWS account (VPC, IAM, security groups) | ⬜ | |
| Provision RDS PostgreSQL (ap-south-1 Mumbai) | ⬜ | Same region as current Supabase |
| Migrate schema + RLS + data to RDS | ⬜ | pg_dump/pg_restore |
| Set up API Gateway + Lambda | ⬜ | |
| Port 20+ edge functions from Deno to Node.js | ⬜ | Biggest effort |
| Set up auth (Cognito or custom JWT) | ⬜ | Decision needed: Cognito vs custom |
| Update frontend to point to new API URLs | ⬜ | Environment variable swap |
| Deploy web build to Cloudflare Pages | ⬜ | Trivial — just `npx expo export --platform web` → push |
| DNS setup (vsped.app or similar domain) | ⬜ | Cloudflare manages DNS |
| SSL certificates (automatic with Cloudflare) | ⬜ | |
| Load testing on AWS infrastructure | ⬜ | |
| Cutover: switch production traffic | ⬜ | |

### Key Decisions Needed

- **Auth approach:** Keep Supabase Auth (it can work standalone without the rest of Supabase) OR migrate to Cognito OR build custom JWT auth?
- **PostgREST:** Deploy standalone PostgREST on AWS (avoids rewriting frontend queries) OR build custom API?
- **Lambda runtime:** Node.js (most common) or Deno on Lambda (preserves existing code)?
- **Timing:** This migration is investor-facing. Can be done in parallel with demo polish, OR after demo.

### Why Supabase is fine for now

- Supabase infrastructure runs on AWS (ap-south-1 Mumbai) — same data center
- Managed services = zero DevOps burden for a 2-person team
- All data is in standard PostgreSQL — portable at any time
- Edge functions are standard Deno — can run anywhere
- The migration is a "when ready" decision, not a "blocked" decision

---

## Phase 8: App Store Deployment (estimated 1 week)

| Task | Status | Notes |
|------|--------|-------|
| Android APK/AAB build (`eas build --platform android`) | ⬜ | |
| Android internal testing track | ⬜ | |
| Google Play Store listing (screenshots, description) | ⬜ | |
| Google Play Store submission | ⬜ | |
| Apple Developer account ($99/yr) | ⬜ | Not confirmed |
| iOS build (`eas build --platform ios`) | ⬜ | |
| App Store Connect listing | ⬜ | |
| Apple App Store submission | ⬜ | Review takes 1-3 days |

---

## Blockers & Dependencies

| Item | Blocker for | Status |
|------|-------------|--------|
| ~~RCI migration~~ | RCI verification | ✅ Done |
| ~~Razorpay account~~ | Payments | ✅ Done (test mode) |
| ~~VideoSDK account~~ | Video sessions | ✅ Done |
| Two-phone testing (with uncle) | Phase 5 | Ready — just needs time |
| Apple Developer account ($99/yr) | Phase 8 iOS | Not confirmed |
| Razorpay live mode activation | Production payments | Test mode works; live needs KYC completion |
| AWS account setup | Phase 7 | Not started |
| Domain name (vsped.app or similar) | Phase 7/8 | Not purchased |
| Legal: Terms of Service review | Phase 8 | Draft exists (privacy-policy-dpdp.md) |

---

## Timeline Estimate (revised July 14)

| Phase | Duration | Target |
|-------|----------|--------|
| ~~Phase 1-4: Backend + Frontend + Payments + Video~~ | ~~4 weeks~~ | ✅ Done (June 13 – July 14) |
| Phase 5: E2E Testing | 3-5 days | July 15-20 |
| Phase 6: Demo Polish + EAS Build | 1 week | July 20-27 |
| Phase 7: AWS/Cloudflare Migration | 2-4 weeks | July 28 – August 15 |
| Phase 8: App Store Deployment | 1 week | August 15-22 |
| **MVP ready for customers + investor demo** | | **~August 22, 2026** |

---

## What "Done" Looks Like (Demo-Ready Criteria)

### A parent can:
- [x] Sign up with phone (OTP + PIN)
- [x] Create child profile (AES-256 encrypted, DPDP compliant)
- [x] Find and view RCI-verified educators (with verification badges)
- [x] Propose a session package (choose child, sessions/week, rate, notes)
- [x] See proposals with status (pending, accepted, countered, paid)
- [x] Accept/withdraw from counter-proposals
- [x] Pay for sessions (Razorpay)
- [x] View sessions in Classroom tab
- [x] Join video sessions (VideoSDK)
- [x] View/revoke consent grants instantly
- [x] Receive in-app notifications
- [ ] Join video session in-app (Phase 6 — EAS Build)

### An educator can:
- [x] Sign up with phone
- [x] Complete profile with RCI number + subjects + rate
- [x] Get provisionally verified (attestation + format check)
- [x] Subscribe (Razorpay payment)
- [x] Appear in parent search (with badge)
- [x] View incoming proposals
- [x] Accept/reject/counter proposals (auto-consent on acceptance)
- [x] Set schedule & offerings (available days, time, recommended weeks)
- [x] Start/join video sessions
- [x] View clients (active consent grants)
- [ ] Conduct in-app video sessions (Phase 6 — EAS Build)

### For the funding demo:
- [x] Full user journey works (both roles)
- [x] Security talking point: "DPDP-compliant, AES-256 encryption, 44 automated security tests"
- [x] Payment flow works (Razorpay test mode)
- [ ] Polished UI with Vathsalya branding (Phase 6)
- [ ] Smooth 3-minute walkthrough script (Phase 6)
- [ ] Web build for instant demo (Phase 6)
- [ ] AWS infrastructure shows scalability readiness (Phase 7)

---

## Deferred Features & Polish Items (DO NOT FORGET)

### Must-Have Before Funding Demo

| Item | Description | Phase |
|------|-------------|-------|
| EAS Build setup | Unlocks native SDKs for video + payment in-app | 6 |
| Native VideoSDK | In-app video calls (no browser) | 6 |
| Native Razorpay | In-app payment checkout (no browser) | 6 |
| Instagram-style child profile | Rich profile: school, notes, milestones, progress | 6 |
| Push notifications | Firebase/APNs via expo-notifications | 6 |
| Demo script | 3-minute walkthrough for funding pitch | 6 |
| AWS migration | Shows investors scalability readiness | 7 |

### Nice-to-Have (Post-Funding)

| Item | Description |
|------|-------------|
| AWS SES email notifications | Receipts, reminders, consent alerts |
| Razorpay recurring (Subscriptions API) | Auto-renewal of educator subscriptions |
| Educator profile edit | Update bio, rate, subjects after initial setup |
| Reviews/ratings system | Parents rate educators after sessions |
| OTA updates (expo-updates) | Push code updates without app store re-submission |
| Manage PIN / reset PIN | Change 4-digit PIN |
| Self-service account deletion | DPDP compliance |
| Network offline handling | Cached data, queued actions |
| Token auto-refresh | Handle expired session tokens gracefully |
| NeuroBridge games integration | Educational games from Venkat's team |

### Known Edge Cases (Phase 5 Testing)

| Case | Expected Behavior | Current State |
|------|-------------------|---------------|
| Session token expiry (1hr) | Auto-refresh or prompt re-login | ✅ Proactive refresh + resilient retry |
| Multiple children — proposal child selector | Parent picks child | ProposalBottomSheet has selector |
| Educator subscription expires mid-booking | Existing bookings honored, new proposals rejected | Handled by eligibility check |
| Parent revokes consent after payment | Educator loses access immediately | Handled by revoke-consent |
| Network offline | Show cached, queue actions | Partial: refresh won't logout on hiccup |
| Concurrent proposal acceptance | Only first succeeds (DB constraints) | Handled by status checks |

---

## Technical Stack Summary (for handoff)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Mobile | React Native 0.81 + Expo SDK 54 | TypeScript, Expo Router |
| State | Zustand 5 + expo-secure-store | Persists auth across sessions |
| Backend | Supabase (PostgreSQL + Edge Functions) | ap-south-1 Mumbai |
| Auth | Supabase Phone Auth + MSG91 SMS Hook | OTP + 4-digit PIN |
| Payments | Razorpay (Payment Links API) | Test mode; live after KYC |
| Video | VideoSDK (prebuilt browser UI) | Native SDK in Phase 6 |
| Encryption | AES-256-GCM (child PII) | Key in Supabase secrets |
| Edge Functions | Deno/TypeScript (20+ functions) | All pinned @2.49.1 |
| Security | 60+ RLS policies, rate limiting, HMAC webhooks | 44 automated tests |
| Compliance | DPDP Act 2023, immutable steering rule | No admin bypass for child data |
