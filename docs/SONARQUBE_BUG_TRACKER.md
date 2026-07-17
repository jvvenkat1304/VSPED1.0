# SonarQube Bug Tracker

**Last Updated:** July 17, 2026
**Scanner:** SonarQube MCP (local analysis via Docker)
**Organization:** jvvenkat1304 (SonarQube Cloud)

---

## Fix Progress: ███████████████░ 95/104 (91%)

| Metric | Count |
|--------|-------|
| Total Issues Found | 104 |
| Fixed | 95 |
| Won't Fix | 4 |
| Remaining | 5 |
| Critical | 1 (won't fix — React component) |
| Major | 0 |
| Minor | 1 (won't fix — readability) |
| Info | 0 |

---

## Files Scanned (31 total)

### Backend — Edge Functions (27 files)

| # | File | Issues | Fixed | Status |
|---|------|--------|-------|--------|
| 1 | `_shared/crr-validator.ts` | 7 | 0 | ⬜ Remaining: regex style, startsWith, escape |
| 2 | `admin-verify-educator/index.ts` | 6 | 3 | 🔄 Remaining: complexity, optional chaining |
| 3 | `create-child/index.ts` | 2 | 2 | ✅ All fixed |
| 4 | `create-educator-profile/index.ts` | 2 | 1 | 🔄 Remaining: nullish coalescing |
| 5 | `create-payment-order/index.ts` | 1 | 0 | ⬜ Remaining: complexity |
| 6 | `create-pin/index.ts` | 1 | 1 | ✅ All fixed |
| 7 | `create-proposal/index.ts` | 2 | 0 | ⬜ Remaining: complexity, nullish coalescing |
| 8 | `create-video-session/index.ts` | 12 | 10 | 🔄 Remaining: complexity, else-if |
| 9 | `expire-proposals/index.ts` | 1 | 1 | ✅ All fixed |
| 10 | `generate-sessions/index.ts` | 1 | 0 | ⬜ Remaining: optional chaining |
| 11 | `get-child/index.ts` | 4 | 4 | ✅ All fixed |
| 12 | `get-proposals/index.ts` | 2 | 1 | 🔄 Remaining: complexity |
| 13 | `propose-session/index.ts` | 2 | 1 | 🔄 Remaining: TODO |
| 14 | `razorpay-webhook/index.ts` | 3 | 3 | ✅ All fixed |
| 15 | `request-consent/index.ts` | 2 | 1 | 🔄 Remaining: TODO |
| 16 | `respond-consent/index.ts` | 2 | 1 | 🔄 Remaining: complexity |
| 17 | `respond-counter/index.ts` | 1 | 0 | ⬜ Remaining: complexity |
| 18 | `respond-proposal/index.ts` | 1 | 0 | ⬜ Remaining: nullish coalescing |
| 19 | `respond-session/index.ts` | 4 | 1 | 🔄 Remaining: complexity, nested ternary, TODO |
| 20 | `revoke-consent/index.ts` | 1 | 1 | ✅ All fixed |
| 21 | `send-otp/index.ts` | 1 | 1 | ✅ All fixed |
| 22 | `send-sms-hook/index.ts` | 2 | 2 | ✅ All fixed |
| 23 | `subscribe-educator/index.ts` | 0 | 0 | ✅ Clean |
| 24 | `verify-otp/index.ts` | 1 | 1 | ✅ All fixed |
| 25 | `verify-pin/index.ts` | 1 | 1 | ✅ All fixed |
| 26 | `verify-rci/index.ts` | 1 | 1 | ✅ All fixed |
| 27 | `verify-subscription/index.ts` | 1 | 0 | ⬜ Remaining: optional chaining |

### Frontend — React Native (33 files)

| # | File | Issues | Fixed | Status |
|---|------|--------|-------|--------|
| 28 | `store/authStore.ts` | 0+L5 | 1 | ✅ All fixed (L5 refresh resilience) |
| 29 | `app/auth/set-pin.tsx` | 3+L1 | 2 | 🔄 Remaining: complexity, else-if |
| 30 | `app/auth/pin-entry.tsx` | 1+L2 | 2 | ✅ All fixed |
| 31 | `app/auth/phone-entry.tsx` | 1 | 1 | ✅ All fixed |
| 32 | `app/auth/otp-verify.tsx` | 2 | 2 | ✅ All fixed |
| 33 | `app/auth/role-select.tsx` | 0 | 0 | ✅ Clean |
| 34 | `app/_layout.tsx` | 0 | 0 | ✅ Clean |
| 35 | `app/index.tsx` | 0+L4 | 1 | ✅ All fixed (L4 race condition) |
| 36 | `app/educator-profile.tsx` | 0 | 0 | ✅ Clean |
| 37 | `app/dashboard/parent.tsx` | 0 | 0 | ✅ Clean |
| 38 | `app/dashboard/_layout.tsx` | 0+L6 | 1 | ✅ All fixed (L6 role guard) |
| 39 | `app/dashboard/educator.tsx` | 4 | 1 | 🔄 Remaining: 3 nested ternaries |
| 40 | `app/dashboard/search.tsx` | 0 | 0 | ✅ Clean |
| 41 | `app/dashboard/games.tsx` | 0 | 0 | ✅ Clean |
| 42 | `app/dashboard/calendar.tsx` | 1 | 1 | ✅ All fixed |
| 43 | `app/dashboard/classroom.tsx` | 1 | 1 | ✅ All fixed |
| 44 | `app/onboarding/educator-setup.tsx` | 8 | 7 | 🔄 Remaining: complexity |
| 45 | `app/onboarding/parent-setup.tsx` | 9 | 6 | 🔄 Remaining: regex `\D` (×3) |
| 46 | `components/ProposalBottomSheet.tsx` | 5 | 3 | 🔄 Remaining: regex `\D` (×2) |
| 47 | `components/NotificationFeed.tsx` | 1 | 0 | ❌ Won't fix (redundant return aids readability) |
| 48 | `components/SubscriptionCheckout.tsx` | 5 | 1 | 🔄 Remaining: 3 nested ternaries, 1 empty catch |
| 49 | `components/ChildProfile.tsx` | 2 | 2 | ✅ All fixed |
| 50 | `components/ConsentManagement.tsx` | 2 | 2 | ✅ All fixed |
| 51 | `components/EducatorProposalsInbox.tsx` | 8 | 5 | 🔄 Remaining: regex `\D` (×3) |
| 52 | `components/AddChildForm.tsx` | 7 | 4 | 🔄 Remaining: regex `\D` (×3) |
| 53 | `components/EducatorOfferings.tsx` | 1 | 1 | ✅ All fixed |
| 54 | `components/EducatorSessions.tsx` | 2 | 1 | 🔄 Remaining: nested ternary |
| 55 | `components/ParentProposalsView.tsx` | 3 | 3 | ✅ All fixed |
| 56 | `components/ParentSessions.tsx` | 1 | 1 | ✅ All fixed |
| 57 | `components/Settings.tsx` | 2 | 2 | ✅ All fixed |
| 58 | `components/PaymentPrompt.tsx` | 1 | 1 | ✅ All fixed |
| 59 | `components/VideoSession.tsx` | 2 | 2 | ✅ All fixed |
| 60 | `constants/theme.ts` | 0 | 0 | ✅ Clean |

---

## All Issues by Severity

### RUNTIME / BEHAVIORAL BUGS (6) — Found via Manual Code Review

These are logic bugs that SonarQube cannot detect. They cause real UX problems (random logouts, wrong dashboard, broken API calls).

| # | File | Line | Severity | Description | Root Cause Of | Status |
|---|------|------|----------|-------------|---------------|--------|
| L1 | `app/auth/set-pin.tsx` | 84 | **CRITICAL** | `setAuth()` called with WRONG argument order — passes `role` as 3rd arg (refreshToken position). Result: refreshToken stored as "parent"/"special_educator" string, actual refresh token never saved. Token refresh permanently broken for any user who goes through new-user flow. | **Random logouts after ~1 hour** | ✅ |
| L2 | `app/auth/pin-entry.tsx` | 64 | **HIGH** | `verify-pin` edge function does NOT return `session_token` or `refresh_token`. Pin-entry reads `data.session_token` (undefined), falls back to route param (likely empty), then stores empty string as session token. | **All API calls return 401 for returning users** | ✅ |
| L3 | `app/index.tsx` | 30-33 | **HIGH** | StarterPage routes returning users to pin-entry with only `user_id` and `role` — no `session_token` passed. Combined with L2, returning users have no auth token after PIN verify. | **Returning users can't load data** | ✅ |
| L4 | `app/_layout.tsx` + `app/index.tsx` | — | **LOW** | Race condition: both `loadFromSecureStore()` and `checkExistingSession()` read from SecureStore independently on mount. If `loadFromSecureStore` triggers `refreshSession()` → fails → calls `logout()` → clears SecureStore BEFORE `checkExistingSession` reads it, user sees starter page despite valid session. | Rare: user might see login screen unnecessarily | ✅ |
| L5 | `store/authStore.ts` | 78 | **MEDIUM** | `refreshSession()` calls `logout()` on ANY error (including network timeout). A 5-second signal drop triggers full session wipe — user must OTP+PIN again. Should retry or require multiple consecutive failures before logout. | **Random logouts on bad network** | ✅ |
| L6 | `app/dashboard/_layout.tsx` | 14 | **MEDIUM** | `const role = useAuthStore(state => state.role)` reads role immediately on render. If navigation to dashboard happens before Zustand hydrates (role is still `null`), `isEducator` = false → educator tabs hidden, parent tab shown. Educator briefly (or permanently) sees parent dashboard. | **Educator defaults to parent dashboard** | ✅ |

### CRITICAL (10) — Cognitive Complexity (SonarQube)

These functions have too many nested branches and should be refactored into smaller helpers.

| # | File | Line | Rule | Complexity | Status |
|---|------|------|------|------------|--------|
| C1 | `respond-consent/index.ts` | 12 | S3776 | 19 (max 15) | ✅ |
| C2 | `create-payment-order/index.ts` | 21 | S3776 | 18 (max 15) | ✅ |
| C3 | `admin-verify-educator/index.ts` (handlePost) | 103 | S3776 | 18 (max 15) | ✅ |
| C4 | `create-video-session/index.ts` | 59 | S3776 | 16 (max 15) | ✅ |
| C5 | `create-proposal/index.ts` | 29 | S3776 | 26 (max 15) | ✅ |
| C6 | `get-proposals/index.ts` | 13 | S3776 | 32 (max 15) | ✅ |
| C7 | `respond-counter/index.ts` | 12 | S3776 | 25 (max 15) | ✅ |
| C8 | `respond-session/index.ts` | 12 | S3776 | 19 (max 15) | ✅ |
| C9 | `app/auth/set-pin.tsx` | 27 | S3776 | 17 (max 15) | ✅ |
| C10 | `app/onboarding/educator-setup.tsx` | 30 | S3776 | 18 (max 15) | ❌ Won't fix (React form component — state + validation + conditional UI is inherent) |

### MAJOR (18) — Logic Bugs, Maintainability

| # | File | Line | Rule | Description | Status |
|---|------|------|------|-------------|--------|
| M1 | `razorpay-webhook/index.ts` | 74 | S1862 | **Duplicate switch case** — `subscription.charged` on lines 66 AND 74. Dead code. | ✅ |
| M2 | `_shared/crr-validator.ts` | 149 | S6557 | Use `String#startsWith` instead of char index check (2 occurrences) | ✅ |
| M3 | `_shared/crr-validator.ts` | 165 | S6535 | Unnecessary escape `\-` in regex (2 occurrences) | ✅ |
| M4 | `admin-verify-educator/index.ts` | 87 | S6582 | Use optional chaining | ✅ |
| M5 | `create-video-session/index.ts` | 173 | S6660 | `if` should not be only statement in `else` block | ✅ |
| M6 | `respond-session/index.ts` | 116 | S3358 | Nested ternary — extract to independent statement | ✅ |
| M7 | `app/auth/set-pin.tsx` | 37 | S6660 | `if` should not be only statement in `else` block | ✅ |
| M8 | `app/auth/otp-verify.tsx` | 144 | S6479 | **Array index used as React key** — can cause render bugs | ✅ |
| M9 | `app/dashboard/educator.tsx` | 58,230,235 | S3358 | Nested ternaries (3 occurrences) | ✅ |
| M10 | `app/dashboard/educator.tsx` | 100 | S6479 | **Array index used as React key** | ✅ |
| M11 | `app/dashboard/calendar.tsx` | 169 | S6479 | **Array index used as React key** | ✅ |
| M12 | `app/dashboard/classroom.tsx` | 96 | S7721 | Move function `formatDateTime` to outer scope (perf) | ✅ |
| M13 | `components/SubscriptionCheckout.tsx` | 231,239,243 | S3358 | Nested ternaries (3 occurrences) | ✅ |
| M14 | `components/SubscriptionCheckout.tsx` | 285 | S6479 | **Array index used as React key** | ✅ |
| M15 | `components/ChildProfile.tsx` | 138 | S7721 | Move function `handleEdit` to outer scope | ✅ |
| M16 | `components/ConsentManagement.tsx` | 165 | S7721 | Move function `formatDate` to outer scope | ✅ |
| M17 | `components/EducatorProposalsInbox.tsx` | 245,265 | S7721 | Move functions `getStatusColor`/`formatDate` to outer scope (2) | ✅ |
| M18 | `respond-proposal/index.ts` | 406 | S6606 | Use nullish coalescing `??` instead of ternary | ✅ |
| M19 | `components/EducatorSessions.tsx` | 105 | S3923 | **Conditional returns same value whether true or false** — dead branch | ✅ |
| M20 | `components/EducatorSessions.tsx` | 232 | S3358 | Nested ternary | ❌ Won't fix (idiomatic JSX conditional rendering) |
| M21 | `components/ParentProposalsView.tsx` | 123,179,215 | S2486 | Empty catch blocks (×3) — counted separately under minor | ✅ |
| M22 | `components/ParentSessions.tsx` | 105 | S7721 | Move `formatDateTime` to outer scope | ✅ |
| M23 | `components/Settings.tsx` | 31,35 | S7721 | Move `handleManagePin`/`handleDeleteAccount` to outer scope (×2) | ✅ |
| M24 | `components/VideoSession.tsx` | 45 | S1854 | **Useless assignment** to `roomId` — assigned but never read | ✅ |
| M25 | `app/onboarding/educator-setup.tsx` | 31 | S1854 | **Useless assignment** to `user_id` | ✅ |
| M26 | `app/onboarding/parent-setup.tsx` | 23 | S1854 | **Useless assignment** to `user_id` | ✅ |

### MINOR (37) — Code Conventions & Style

| # | File | Line | Rule | Description | Status |
|---|------|------|------|-------------|--------|
| m1 | `create-child/index.ts` | 16 | S7773 | `Number.parseInt` instead of `parseInt` | ✅ |
| m2 | `create-child/index.ts` | 80-82 | S2486 | Empty catch block | ✅ |
| m3 | `respond-consent/index.ts` | 153-155 | S2486 | Empty catch block | ✅ |
| m4 | `razorpay-webhook/index.ts` | 41 | S7758 | `codePointAt()` instead of `charCodeAt()` (×2) | ✅ |
| m5 | `_shared/crr-validator.ts` | 72,154,165 | S6353 | `\d` instead of `[0-9]` (×3) | ✅ |
| m6 | `admin-verify-educator/index.ts` | 163 | S6582 | Optional chaining | ✅ |
| m7 | `admin-verify-educator/index.ts` | 244-245 | S7773 | `Number.parseInt` (×2) | ✅ |
| m8 | `admin-verify-educator/index.ts` | 334-339 | S2486 | Empty catch block | ✅ |
| m9 | `create-educator-profile/index.ts` | 40-42 | S6606 | Nullish coalescing instead of ternary | ✅ |
| m10 | `create-educator-profile/index.ts` | 106-108 | S2486 | Empty catch block | ✅ |
| m11 | `create-pin/index.ts` | 54-59 | S2486 | Empty catch block | ✅ |
| m12 | `create-proposal/index.ts` | 186-188 | S6606 | Nullish coalescing instead of ternary | ✅ |
| m13 | `expire-proposals/index.ts` | 32-37 | S2486 | Empty catch block | ✅ |
| m14 | `generate-sessions/index.ts` | 83 | S6582 | Optional chaining | ✅ |
| m15 | `get-child/index.ts` | 17-19 | S7773 | `Number.parseInt` (×3) | ✅ |
| m16 | `get-child/index.ts` | 111-113 | S2486 | Empty catch block | ✅ |
| m17 | `get-proposals/index.ts` | 227-232 | S2486 | Empty catch block | ✅ |
| m18 | `propose-session/index.ts` | 109-111 | S2486 | Empty catch block | ✅ |
| m19 | `request-consent/index.ts` | 110-112 | S2486 | Empty catch block | ✅ |
| m20 | `revoke-consent/index.ts` | 77-79 | S2486 | Empty catch block | ✅ |
| m21 | `send-otp/index.ts` | 64-69 | S2486 | Empty catch block | ✅ |
| m22 | `send-sms-hook/index.ts` | 21-26,63-68 | S2486 | Empty catch blocks (×2) | ✅ |
| m23 | `verify-otp/index.ts` | 63-68 | S2486 | Empty catch block | ✅ |
| m24 | `verify-pin/index.ts` | 98-103 | S2486 | Empty catch block | ✅ |
| m25 | `verify-rci/index.ts` | 181-183 | S2486 | Empty catch block | ✅ |
| m26 | `verify-subscription/index.ts` | 70 | S6582 | Optional chaining | ✅ |
| m27 | `create-video-session/index.ts` | 32-38 | S7781 | `replaceAll()` instead of `replace()` with regex (×9) | ✅ |
| m28 | `create-video-session/index.ts` | 51 | S7758 | `String.fromCodePoint()` instead of `fromCharCode()` | ✅ |
| m29 | `app/auth/set-pin.tsx` | 94-96 | S2486 | Empty catch block | ✅ |
| m30 | `app/auth/pin-entry.tsx` | 71-74 | S2486 | Empty catch block | ✅ |
| m31 | `app/auth/phone-entry.tsx` | 54-56 | S2486 | Empty catch block | ✅ |
| m32 | `app/auth/otp-verify.tsx` | 118-120 | S2486 | Empty catch block | ✅ |
| m33 | `components/ProposalBottomSheet.tsx` | 65-66 | S7773 | `Number.parseInt` (×2) | ✅ |
| m34 | `components/ProposalBottomSheet.tsx` | 140-142 | S2486 | Empty catch block | ✅ |
| m35 | `components/ProposalBottomSheet.tsx` | 235,248 | S6353 | `\D` instead of `[^0-9]` (×2) | ✅ |
| m36 | `components/NotificationFeed.tsx` | 153 | S3626 | Redundant jump (unnecessary `return`) | ❌ Won't fix (readability) |
| m37 | `components/EducatorProposalsInbox.tsx` | 195-197 | S7773 | `Number.parseInt` (×3) | ✅ |
| m38 | `components/EducatorProposalsInbox.tsx` | 358,372,386 | S6353 | `\D` instead of `[^0-9]` (×3) | ✅ |
| m39 | `components/AddChildForm.tsx` | 49-51 | S7773 | `Number.parseInt` (×3) | ✅ |
| m40 | `components/AddChildForm.tsx` | 88-90 | S2486 | Empty catch block | ✅ |
| m41 | `components/AddChildForm.tsx` | 122,131,140 | S6353 | `\D` instead of `[^0-9]` (×3) | ✅ |
| m42 | `components/EducatorOfferings.tsx` | 111 | S7773 | `Number.parseInt` | ✅ |
| m43 | `components/ParentProposalsView.tsx` | 123,179,215 | S2486 | Empty catch blocks (×3) | ✅ |
| m44 | `components/PaymentPrompt.tsx` | 84-86 | S2486 | Empty catch block | ✅ |
| m45 | `components/VideoSession.tsx` | 86-89 | S2486 | Empty catch block | ✅ |
| m46 | `app/onboarding/educator-setup.tsx` | 68-69,94-95 | S7773 | `Number.parseInt` (×4) | ✅ |
| m47 | `app/onboarding/educator-setup.tsx` | 106-108,145-147 | S2486 | Empty catch blocks (×2) | ✅ |
| m48 | `app/onboarding/parent-setup.tsx` | 51-53 | S7773 | `Number.parseInt` (×3) | ✅ |
| m49 | `app/onboarding/parent-setup.tsx` | 62 | S7773 | `Number.isNaN` instead of `isNaN` | ✅ |
| m50 | `app/onboarding/parent-setup.tsx` | 94-96 | S2486 | Empty catch block | ✅ |
| m51 | `app/onboarding/parent-setup.tsx` | 154,163,172 | S6353 | `\D` instead of `[^0-9]` (×3) | ✅ |

### INFO (4) — TODOs

| # | File | Line | Rule | Description | Status |
|---|------|------|------|-------------|--------|
| i1 | `propose-session/index.ts` | 98 | S1135 | TODO: Send notification to parent | ✅ |
| i2 | `respond-session/index.ts` | 108 | S1135 | TODO: Notify educator about parent's response | ✅ |
| i3 | `request-consent/index.ts` | 102 | S1135 | TODO: Send push notification to parent | ✅ |
| i4 | `components/ChildProfile.tsx` | 2 | S1128 | Unused import of `router` | ✅ |

---

## Patterns Identified

| Pattern | Count | Impact | Fix Strategy |
|---------|-------|--------|--------------|
| Empty catch blocks (S2486) | 30 | Low | Add `console.error(_err)` to all catch blocks. Batch fix. |
| Cognitive complexity (S3776) | 10 | High | Extract validation, auth, and DB logic into helper functions. |
| `parseInt` → `Number.parseInt` (S7773) | 22 | Low | Find-and-replace. Trivial. |
| Nested ternaries (S3358) | 8 | Medium | Extract to variables or if/else. |
| Array index as React key (S6479) | 4 | Medium | Use item `id` or unique property. Can cause render bugs. |
| Functions inside components (S7721) | 8 | Medium | Move to module scope. Prevents unnecessary re-creation on re-render. |
| `replace` → `replaceAll` (S7781) | 9 | Low | Direct substitution. |
| Regex `[0-9]`/`[^0-9]` → `\d`/`\D` (S6353) | 17 | Low | Cosmetic. |
| Optional chaining (S6582) | 4 | Low | Trivial. |
| Nullish coalescing (S6606) | 3 | Low | Trivial. |
| Useless assignments (S1854) | 3 | Medium | Remove dead variables. |
| TODO comments (S1135) | 3 | Info | Implement the missing notifications or remove if shipped. |
| Conditional returns same value (S3923) | 1 | Medium | Dead branch — logic bug or leftover code. |

---

## Fix Priority Order

### Wave 0 — RUNTIME BUGS (fix IMMEDIATELY — these cause user-facing problems)
1. **L1** — Fix `setAuth` call in set-pin.tsx (wrong arg order → broken refresh → random logouts)
2. **L2 + L3** — Fix verify-pin flow: either make verify-pin return a session token, or get a fresh session via Supabase refresh on PIN success
3. **L5** — Make refreshSession retry-resilient (don't logout on first failure)
4. **L6** — Guard dashboard layout: show loading state until role is hydrated
5. **L4** — Serialize store load and route check (low priority — rare)

### Wave 1 — Logic Bugs (fix first)
6. **M1** — Duplicate switch case in razorpay-webhook (dead code / potential missed event)
7. **M8, M10, M11, M14** — Array index as React key (can cause render glitches)

### Wave 2 — Complexity Refactors (most impactful for maintainability)
3. **C5** — `create-proposal` (complexity 26 — worst offender)
4. **C6** — `get-proposals` (complexity 32 — absolute worst)
5. **C7** — `respond-counter` (complexity 25)
6. **C1, C2, C3, C4, C8, C9** — Remaining complexity issues

### Wave 3 — Performance (React)
7. **M12, M15, M16, M17** — Move functions to outer scope
8. **M9, M13, M6** — Nested ternaries → readable conditionals

### Wave 4 — Batch Fixes (low effort, high count)
9. **m2-m25, m29-m32** — All 22 empty catch blocks (add `console.error`)
10. **m1, m7, m15, m33, m37** — All 12 `parseInt` → `Number.parseInt`
11. **m27** — All 9 `replace` → `replaceAll`
12. **m5, m35** — All 8 regex improvements
13. **m4, m28** — `charCodeAt` → `codePointAt`

### Wave 5 — Info/Optional
14. **i1, i2, i3** — Implement TODO notifications (or mark as won't-do if notifications are in app)
15. **i4** — Remove unused import
16. **M2, M3** — crr-validator style improvements

---

## Clean Files (no issues)

- `subscribe-educator/index.ts` ✅
- `store/authStore.ts` ✅
- `app/_layout.tsx` ✅
- `app/index.tsx` ✅
- `app/educator-profile.tsx` ✅
- `app/auth/role-select.tsx` ✅
- `app/dashboard/parent.tsx` ✅
- `app/dashboard/_layout.tsx` ✅
- `app/dashboard/search.tsx` ✅
- `app/dashboard/games.tsx` ✅
- `constants/theme.ts` ✅

---

## Notes

- **No security vulnerabilities found.** AES-256 encryption, HMAC-SHA256 verification, and constant-time comparison are all correctly implemented.
- **No secrets in code.** All API keys/tokens are read from `Deno.env` or Supabase secrets. (Note: the anon key in frontend files is public by design — it's not a secret.)
- **Child data privacy is intact.** Consent checks, encryption, and RLS policies have zero issues flagged.
- The DPDP compliance layer passed without any findings.
- The one real webhook bug (M1 — duplicate case) means `subscription.activated` events may be incorrectly handled.
- **Root causes identified:** L1 causes random logouts for new users. L6 causes the educator→parent dashboard defaulting. L2+L3 cause data not loading for returning users. L5 causes logouts on bad network.
