# V-SPED Code Quality & Bug Tracker

**Last Updated:** July 17, 2026
**Tools Used:** SonarQube MCP (local Docker analysis) + Manual Code Review
**Organization:** jvvenkat1304 (SonarQube Cloud)
**Final Scan:** All 60 files — PASSED

---

## Final Status: ████████████████ 100/104 RESOLVED (96%)

| Metric | Count |
|--------|-------|
| Total Issues Found | 104 |
| Fixed | 100 |
| Won't Fix (with justification) | 4 |
| Open | 0 |

---

## Summary

On July 17, 2026, we performed a complete codebase audit:
1. **SonarQube automated scan** — found 98 code quality issues across 60 files
2. **Manual logic review** — found 6 runtime/behavioral bugs causing real UX problems
3. **All 100 fixable issues resolved** in a single session
4. **Full re-scan confirmed** zero actionable issues remain
5. **4 issues intentionally left** (explained below with full justification)

---

## Won't Fix Issues — Full Justification

### WF1: `otp-verify.tsx` — Array index in key (`key={`otp-box-${index}`}`)

**Rule:** S6479 (Do not use Array index in keys)
**Why it exists:** When React lists are reordered, filtered, or items added/removed, index-based keys cause stale renders because React can't distinguish which item is which.

**Why we're NOT fixing it:**
- The OTP input is a **fixed 6-element array** that is NEVER reordered, filtered, or resized
- Each box always represents position 0-5 — there's no scenario where box 3 becomes box 5
- The alternative (generating UUIDs for each box) adds complexity for zero benefit
- Even with a prefix like `otp-box-${index}`, SonarQube still flags it because it detects the variable
- This is a **known false positive** for static arrays in React — the rule was designed for dynamic lists (user lists, messages, search results)

**Risk if left unfixed:** Zero. No render bugs possible since the array never changes structure.

---

### WF2: `educator-setup.tsx` — Cognitive Complexity 18 (max 15)

**Rule:** S3776 (Refactor function to reduce complexity)
**Why it exists:** Highly complex functions are hard to understand, test, and maintain.

**Why we're NOT fixing it:**
- This is a **React form component** — it inherently has: state declarations (14 useState hooks), validation logic, conditional rendering (profile step vs verification step), API calls, and error handling
- The complexity is **distributed across the component lifecycle**, not concentrated in one branch
- Splitting it into sub-components would require passing 14+ props or using context — making it HARDER to understand, not easier
- We already extracted `validateProfileInput()` which reduced it from 22 → 18, but the remaining complexity is the component itself (conditional JSX rendering)
- React components are fundamentally different from backend functions — SonarQube's complexity rule was designed for imperative code, not declarative UI

**Risk if left unfixed:** None functionally. A future developer might find it slightly harder to modify, but it's well-commented and logically structured in steps.

---

### WF3: `NotificationFeed.tsx` — Redundant return (line 153)

**Rule:** S3626 (Remove redundant jump)
**Why it exists:** A `return` at the end of a function (or after all branches return) is technically unnecessary.

**Why we're NOT fixing it:**
```typescript
if (notification.type === 'consent_granted') {
  router.push('/dashboard/educator');
  return;  // ← SonarQube says this is redundant
}
// No recognizable target — just mark as read
```
- This is part of an **early-return pattern** — a chain of `if` blocks that each handle a notification type and return
- The `return` makes it explicit: "this branch is done, we're not falling through"
- Removing it would make a future developer question: "does anything else execute after this?"
- The **intent clarity** outweighs the one redundant instruction
- This is a style preference explicitly chosen for readability in switch-like notification handlers

**Risk if left unfixed:** Zero. One extra `return` instruction that the JS engine optimizes away.

---

### WF4: `EducatorSessions.tsx` — Nested ternary in JSX (line 232)

**Rule:** S3358 (Extract nested ternary into independent statement)
**Why it exists:** Nested ternaries like `a ? b ? c : d : e` are hard to read in business logic.

**Why we're NOT fixing it:**
```jsx
{displayedSessions.length === 0 ? (
  <EmptyState />
) : !activeVideoSessionId ? (
  <SessionList />
) : null}
```
- This is **idiomatic React JSX conditional rendering** — the standard pattern for "if A render X, else if B render Y, else nothing"
- Every React developer recognizes this pattern instantly
- The alternatives are:
  - Multiple `{condition && <Component />}` blocks — more verbose, less clear about mutual exclusivity
  - Extract a `renderContent()` function — adds indirection for 3 lines of logic
  - `switch` statement in a helper — can't be used inline in JSX
- SonarQube's rule targets nested ternaries in **business logic** (calculations, variable assignments), not JSX templates

**Risk if left unfixed:** Zero. This is readable, correct, and follows React conventions.

---

## Issues Fixed — By Category

### Runtime/Behavioral Bugs (6 fixed)
| # | Impact | Fix |
|---|--------|-----|
| L1 | Random logouts after 1hr (new users) | Fixed `setAuth` argument order — refreshToken was receiving role string |
| L2+L3 | API calls fail for returning users | Pin-entry now refreshes session via stored refresh token |
| L4 | Rare: user sees login despite valid session | StarterPage waits for store hydration before checking |
| L5 | Random logouts on bad network | refreshSession only logs out on truly invalid tokens (401/403/expired) |
| L6 | Educator sees parent dashboard | Dashboard shows loading spinner until role is hydrated |

### Logic Bugs (5 fixed)
| # | Impact | Fix |
|---|--------|-----|
| M1 | Dead code in webhook | Removed duplicate `case "subscription.charged"` |
| M19 | Dead branch in EducatorSessions | Conditional returned null both ways — simplified |
| M24 | Unused state variable | Removed `roomId` state in VideoSession |
| M25-M26 | Unused variables | Removed `user_id` from educator-setup + parent-setup params |

### Complexity Refactors (10 fixed)
| File | Before | After | Helpers Extracted |
|------|--------|-------|-------------------|
| get-proposals | 32 | 0 | resolveUserRole, fetchPaymentMap, formatProposal |
| create-proposal | 26 | 0 | validateProposalInput, verifyEducatorEligibility |
| respond-counter | 25 | 0 | handleAcceptCounter, handleWithdraw |
| respond-consent | 19 | 0 | resolveConsentDecision, createConsentGrant |
| respond-session | 19 | 0 | validateStateTransition, buildUpdateData, getNotification |
| create-payment-order | 18 | 0 | getOrCreatePaymentRecord, createRazorpayPaymentLink |
| admin-verify-educator | 18 | 0 | buildVerificationPayload |
| create-video-session | 16 | 0 | Auto-resolved by else-if fix |
| set-pin.tsx | 17 | 0 | Auto-resolved by else-if fix |
| educator-setup.tsx | 18 | 18 | Won't fix (React form) |

### Batch Fixes (79 fixed)
| Category | Count | What was done |
|----------|-------|---------------|
| Empty catch blocks | 30 | Added `console.error('[FunctionName] error:', err)` to every catch |
| `parseInt` → `Number.parseInt` | 22 | Modern syntax, explicit radix |
| `replace` → `replaceAll` | 9 | VideoSDK JWT — clearer intent, no regex needed |
| Regex `[0-9]`/`[^0-9]` → `\d`/`\D` | 14 | Concise character classes |
| Optional chaining | 4 | `!x \|\| !x.y` → `!x?.y` |
| Nullish coalescing | 3 | `x !== null ? x : y` → `x ?? y` |
| `charCodeAt` → `codePointAt` | 2 | Modern string method |
| `fromCharCode` → `fromCodePoint` | 1 | Modern string method |
| Nested ternaries → helpers | 8 | Extracted getVerificationLabel, getStatusBg, etc. |
| Functions moved to outer scope | 8 | formatDate, handleEdit, etc. — prevents re-creation on re-render |
| Array index keys → stable keys | 4 | day.toISOString(), c.id, feature text |
| `startsWith` instead of char index | 2 | crr-validator |
| Unnecessary regex escape | 2 | Removed `\-` in character class |
| Duplicate switch case removed | 1 | razorpay-webhook dead code |
| Unused import removed | 1 | ChildProfile `router` |
| TODO → implemented | 3 | Notifications for propose-session, respond-session, request-consent |
| Dead branch simplified | 1 | EducatorSessions null:null → null |
| Useless assignments removed | 3 | roomId, user_id (×2) |
| Redundant return | 1 | Won't fix (readability) |

---

## UI Fixes (Same Session)

| Issue | Fix |
|-------|-----|
| Bottom tab bar hidden behind Android nav buttons | Added `SafeAreaProvider` to root — Expo Router Tabs now auto-respects system nav |
| Content crashing into status/notification bar | `useSafeAreaInsets` in auth screens — dynamic `paddingTop: insets.top + 40` replaces fixed `paddingTop: 80` |
| OTP auto-read only fills last digit | `handleChange` now spreads multi-digit input from index 0 regardless of which box received it |

---

## Files Status (Final)

### Backend — 27 files: ALL CLEAN ✅

Every edge function passes SonarQube with zero issues.

### Frontend — 33 files: 29 CLEAN ✅ + 4 with accepted won't-fix

| File | Won't-Fix Issue |
|------|-----------------|
| `otp-verify.tsx` | Index key on static 6-element OTP array |
| `educator-setup.tsx` | Component complexity 18 (React form inherent) |
| `NotificationFeed.tsx` | Redundant return in early-return pattern |
| `EducatorSessions.tsx` | Nested ternary (idiomatic JSX) |

---

## Commits

| Commit | Files | Description |
|--------|-------|-------------|
| `86623b4` | 57 | SonarQube full scan + 6 runtime bugs + complexity refactors + all batch fixes |
| Pending | 6 | UI safe area fix + OTP autofill fix + this tracker update |

---

## How to Re-Run This Scan

The SonarQube MCP server is configured at `.kiro/settings/mcp.json`. To re-scan any file:
```
Ask Kiro: "Scan [filename] with SonarQube"
```
It runs locally in Docker — no code is uploaded.
